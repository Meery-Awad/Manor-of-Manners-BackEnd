const crypto = require("crypto");
const { User } = require("../data");
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

function getGraphClient() {
  const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
  return Client.init({
    authProvider: async (done) => {
      try {
        const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
        done(null, tokenResponse.token);
      } catch (err) {
        done(err, null);
      }
    },
  });
}

exports.notificationAlert = async (req, res) => {
  try {
    const { course } = req.body;
    if (!course) return res.status(400).json({ message: "Course data is required" });

    const users = await User.find({}, "email name");
    if (!users.length) return res.status(200).json({ message: "No users to notify" });

    const client = getGraphClient();
    if (!course.isNotLive)
      for (const user of users) {
        const mail = {
          message: {
            subject: `📢 New Course Added: ${course.name}`,
            body: {
              contentType: "HTML",
              content: `
              <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
                <h2>New Course Available 🎉</h2>
                <p>Hi ${user.name}, we're excited to announce a new course on <b>${course.name}</b>!</p>
                <p>${course.description || ""}</p>
                <p><b>Date:</b> ${course.date} (${course.time} - ${course.endtime})</p>
                <p><b>Price:</b> ${course.price} £</p>
                <a href="https://madeformanners.com/courses" 
                   style="background:#C6A662;color:white;padding:10px 18px;text-decoration:none;border-radius:6px">
                   View Course
                </a>
                <br/><br/>
                <small>This is an automated message — please do not reply.</small>
              </div>
            `,
            },
            toRecipients: [{ emailAddress: { address: user.email } }],
          },

          saveToSentItems: "true",

        };

        await client.api(`/users/${SENDER_EMAIL}/sendMail`).post(mail);
      }

    res.json({ message: "Notification sent successfully via email", notifiedUsers: users.length });
  } catch (err) {
    console.error("❌ Error sending notification:", err);
    res.status(500).json({ message: "Server error while sending notification", error: err.message });
  }

};

exports.contactMessageAlert = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message)
      return res.status(400).json({ message: "All required fields must be filled" });

    const client = getGraphClient();

    const mail = {
      message: {
        subject: `📩 New Contact Message from ${name}`,
        body: {
          contentType: "HTML",
          content: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
            <h2>📬 New Contact Form Submission</h2>
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone || "—"}</p>
            <p><b>Message:</b></p>
            <div style="border-left:3px solid #C6A662;padding-left:10px;margin-top:5px">
              ${message}
            </div>
             <a href="https://madeformanners.com/contact" 
                   style="background:#C6A662;color:white;padding:10px 18px;text-decoration:none;border-radius:6px">
                   View Course
                </a>
            <br/>
            <small>This message was automatically forwarded from the website contact form.</small>
          </div>
          `
        },
        toRecipients: [
          { emailAddress: { address: "hello@madeformanners.com" } }

        ],
      },
      saveToSentItems: "true",

    };

    await client.api(`/users/${SENDER_EMAIL}/sendMail`).post(mail);
    console.log('true')
    res.status(200).json({ message: "Contact message sent to admin successfully" });
  } catch (err) {
    console.error("❌ Error sending contact message:", err);
    res.status(500).json({ message: "Server error while sending contact email", error: err.message });
  }
};



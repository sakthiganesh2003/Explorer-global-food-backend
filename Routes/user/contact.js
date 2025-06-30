// routes/contact.js
const express = require('express');
const mongoose = require('mongoose'); // Added mongoose import
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const ContactForm = require('../../Models/user/contact'); // Fixed path and model name

dotenv.config();

const router = express.Router();

// Configure email service (example for Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Note: Avoid using rejectUnauthorized: false in production
  tls: {
    rejectUnauthorized: false, // Only for development; remove or configure securely in production
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: `"Support Team" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error; // Propagate error to be handled by the caller
  }
};

// Submit contact form
router.post('/submit', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    const newSubmission = new ContactForm({
      name,
      email,
      message,
    });

    await newSubmission.save();

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: 'Thank you for contacting us',
      text: `Hello ${name},\n\nWe've received your message and will get back to you soon.\n\nYour message: ${message}\n\nBest regards,\nThe Support Team`,
    });

    res.status(201).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error submitting form', error: error.message });
  }
});

// Get all tickets with filtering
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
      ];
    }

    const tickets = await ContactForm.find(query).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
});

// Update ticket status and send response
router.put('/:id', async (req, res) => {
  try {
    // Validate request parameters
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid ticket ID format' });
    }

    const { status, adminNotes, sendEmailResponse } = req.body;

    // Validate required fields
    if (!status || !['open', 'pending', 'resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid or missing status' });
    }

    // Find and update the ticket
    const updatedTicket = await ContactForm.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNotes: adminNotes || '',
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    );

    // Check if ticket exists
    if (!updatedTicket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Send email response if requested
    let emailSent = false;
    if (sendEmailResponse && adminNotes) {
      try {
        // Validate email data before sending
        if (!updatedTicket.email || !updatedTicket.name) {
          console.warn('Cannot send email - missing recipient data', {
            ticketId: updatedTicket._id,
            hasEmail: !!updatedTicket.email,
            hasName: !!updatedTicket.name,
          });
        } else {
          await sendEmail({
            to: updatedTicket.email,
            subject: `Re: Your support ticket (${updatedTicket.status})`,
            text: `Hello ${updatedTicket.name},\n\nThank you for contacting us. Here's our response:\n\n${adminNotes}\n\nBest regards,\nThe Support Team`,
            html: `
              <p>Hello ${updatedTicket.name},</p>
              <p>Thank you for contacting us. Here's our response:</p>
              <p>${adminNotes.replace(/\n/g, '<br>')}</p>
              <p>Best regards,<br>The Support Team</p>
            `,
          });
          console.log(`Email sent for ticket ${updatedTicket._id}`);
          emailSent = true;
        }
      } catch (emailError) {
        console.error('Failed to send email response:', emailError);
      }
    }

    // Return the updated ticket
    res.json({
      success: true,
      data: updatedTicket,
      emailSent,
    });
  } catch (error) {
    console.error('Error updating ticket:', error);

    // Handle different error types
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
      });
    }

    res.status(500).json({
      message: 'Error updating ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
const nodemailer = require("nodemailer");

// Format datetime in a consistent timezone (Africa/Cairo = UTC+2 for Egypt)
const TIMEZONE = process.env.TZ_DISPLAY || 'Africa/Cairo';
const formatShowtime = (dt) => {
  return new Date(dt).toLocaleString('en-US', { timeZone: TIMEZONE, dateStyle: 'short', timeStyle: 'short' });
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendBookingConfirmation = async ({ to, name, reference, movie, showtime, seats, snacks, total }) => {
  const seatList = seats.map(s => s.row_label + s.seat_number + " (" + s.seat_type + ")").join(", ");
  const snackList = snacks.length
    ? snacks.map(s => s.name + " x" + s.quantity + " — $" + (s.price * s.quantity).toFixed(2)).join("<br/>")
    : "None";

  const html = "<div style=" + JSON.stringify("font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;") + ">" +
    "<div style=" + JSON.stringify("background: #1a1a2e; color: white; padding: 24px; text-align: center;") + ">" +
    "<h1 style=" + JSON.stringify("margin:0; font-size: 24px;") + ">Booking Confirmed!</h1></div>" +
    "<div style=" + JSON.stringify("padding: 24px;") + ">" +
    "<p>Hi <strong>" + name + "</strong>,</p>" +
    "<p>Your booking has been confirmed. Here are your details:</p>" +
    "<table style=" + JSON.stringify("width:100%; border-collapse: collapse; margin: 16px 0;") + ">" +
    "<tr style=" + JSON.stringify("background:#f9f9f9") + "><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Reference</td><td style=" + JSON.stringify("padding:10px;") + ">" + reference + "</td></tr>" +
    "<tr><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Movie</td><td style=" + JSON.stringify("padding:10px;") + ">" + movie + "</td></tr>" +
    "<tr style=" + JSON.stringify("background:#f9f9f9") + "><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Showtime</td><td style=" + JSON.stringify("padding:10px;") + ">" + formatShowtime(showtime) + "</td></tr>" +
    "<tr><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Seats</td><td style=" + JSON.stringify("padding:10px;") + ">" + seatList + "</td></tr>" +
    "<tr style=" + JSON.stringify("background:#f9f9f9") + "><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Snacks</td><td style=" + JSON.stringify("padding:10px;") + ">" + snackList + "</td></tr>" +
    "<tr><td style=" + JSON.stringify("padding:10px; font-weight:bold; font-size:18px;") + ">Total</td><td style=" + JSON.stringify("padding:10px; font-size:18px; color:#e63946;") + "><strong>$" + parseFloat(total).toFixed(2) + "</strong></td></tr>" +
    "</table>" +
    "<p style=" + JSON.stringify("color:#666; font-size:13px;") + ">Please present your reference number at the cinema entrance.</p>" +
    "</div>" +
    "<div style=" + JSON.stringify("background:#f5f5f5; padding: 16px; text-align:center; color:#999; font-size:12px;") + ">CinemaBooking &copy; 2026 - Thank you for booking with us!</div>" +
    "</div>";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Booking Confirmed -- " + movie + " [" + reference + "]",
    html,
  });
};

const sendCancellationEmail = async ({ to, name, reference, movie, showtime, seats, total, cancelledBy = 'admin' }) => {
  const seatList = seats.map(s => s.row_label + s.seat_number + " (" + s.seat_type + ")").join(", ");
  const cancelMessage = cancelledBy === 'user'
    ? "Your booking has been successfully <strong>cancelled</strong> as requested."
    : "We are sorry to inform you that your booking has been <strong>cancelled</strong> by our team.";
  const footerNote = cancelledBy === 'user'
    ? "We hope to see you again soon! If this was a mistake, please contact our support team."
    : "If you believe this is a mistake, please contact our support team.";

  const html = "<div style=" + JSON.stringify("font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;") + ">" +
    "<div style=" + JSON.stringify("background: #c0392b; color: white; padding: 24px; text-align: center;") + ">" +
    "<h1 style=" + JSON.stringify("margin:0; font-size: 24px;") + ">Booking Cancelled</h1></div>" +
    "<div style=" + JSON.stringify("padding: 24px;") + ">" +
    "<p>Hi <strong>" + name + "</strong>,</p>" +
    "<p>" + cancelMessage + "</p>" +
    "<table style=" + JSON.stringify("width:100%; border-collapse: collapse; margin: 16px 0;") + ">" +
    "<tr style=" + JSON.stringify("background:#f9f9f9") + "><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Reference</td><td style=" + JSON.stringify("padding:10px;") + ">" + reference + "</td></tr>" +
    "<tr><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Movie</td><td style=" + JSON.stringify("padding:10px;") + ">" + movie + "</td></tr>" +
    "<tr style=" + JSON.stringify("background:#f9f9f9") + "><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Showtime</td><td style=" + JSON.stringify("padding:10px;") + ">" + formatShowtime(showtime) + "</td></tr>" +
    "<tr><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Seats</td><td style=" + JSON.stringify("padding:10px;") + ">" + seatList + "</td></tr>" +
    "<tr style=" + JSON.stringify("background:#f9f9f9") + "><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Total Paid</td><td style=" + JSON.stringify("padding:10px;") + ">$" + parseFloat(total).toFixed(2) + "</td></tr>" +
    "</table>" +
    "<p style=" + JSON.stringify("color:#666; font-size:13px;") + ">" + footerNote + "</p>" +
    "</div>" +
    "<div style=" + JSON.stringify("background:#f5f5f5; padding: 16px; text-align:center; color:#999; font-size:12px;") + ">CinemaBooking &copy; 2026 - We hope to see you again soon!</div>" +
    "</div>";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Booking Cancelled -- " + movie + " [" + reference + "]",
    html,
  });
};


const sendWaitlistNotification = async ({ to, name, movie, showtime, showtimeId }) => {
  const bookingUrl = (process.env.FRONTEND_URL || 'https://cinema-booking-flame.vercel.app') + '/booking/' + showtimeId + '/seats';

  const html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">' +
    '<div style="background: #1d6fa4; color: white; padding: 24px; text-align: center;">' +
    '<h1 style="margin:0; font-size: 24px;">Seat Available!</h1></div>' +
    '<div style="padding: 24px;">' +
    '<p>Hi <strong>' + name + '</strong>,</p>' +
    '<p>Good news! A seat has just become available for a show you were waiting for:</p>' +
    '<table style="width:100%; border-collapse: collapse; margin: 16px 0;">' +
    '<tr style="background:#f9f9f9"><td style="padding:10px; font-weight:bold;">Movie</td><td style="padding:10px;">' + movie + '</td></tr>' +
    '<tr><td style="padding:10px; font-weight:bold;">Showtime</td><td style="padding:10px;">' + formatShowtime(showtime) + '</td></tr>' +
    '</table>' +
    '<p style="text-align:center; margin: 24px 0;">' +
    '<a href="' + bookingUrl + '" style="background:#2563eb; color:white; padding:12px 32px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:16px;">Book Now</a>' +
    '</p>' +
    '<p style="color:#666; font-size:13px;">Hurry! Seats are limited and may be taken by others on the waitlist.</p>' +
    '</div>' +
    '<div style="background:#f5f5f5; padding: 16px; text-align:center; color:#999; font-size:12px;">CinemaBooking &copy; 2026</div>' +
    '</div>';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Seat Available -- ' + movie + ' on ' + new Date(showtime).toLocaleDateString('en-US', { timeZone: TIMEZONE }),
    html,
  });
};

const sendSeatRemovalEmail = async ({ to, name, reference, movie, showtime, removedSeats, remainingSeats, newTotal }) => {
  const removedList = removedSeats.map(s => s.row_label + s.seat_number + " (" + s.seat_type + ")").join(", ");
  const remainingList = remainingSeats.length
    ? remainingSeats.map(s => s.row_label + s.seat_number + " (" + s.seat_type + ")").join(", ")
    : "None";

  const html = "<div style=" + JSON.stringify("font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;") + ">" +
    "<div style=" + JSON.stringify("background: #e67e22; color: white; padding: 24px; text-align: center;") + ">" +
    "<h1 style=" + JSON.stringify("margin:0; font-size: 24px;") + ">Booking Updated</h1></div>" +
    "<div style=" + JSON.stringify("padding: 24px;") + ">" +
    "<p>Hi <strong>" + name + "</strong>,</p>" +
    "<p>Your booking has been <strong>modified</strong> by our team. The following seat(s) have been removed:</p>" +
    "<table style=" + JSON.stringify("width:100%; border-collapse: collapse; margin: 16px 0;") + ">" +
    "<tr style=" + JSON.stringify("background:#f9f9f9") + "><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Reference</td><td style=" + JSON.stringify("padding:10px;") + ">" + reference + "</td></tr>" +
    "<tr><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Movie</td><td style=" + JSON.stringify("padding:10px;") + ">" + movie + "</td></tr>" +
    "<tr style=" + JSON.stringify("background:#f9f9f9") + "><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Showtime</td><td style=" + JSON.stringify("padding:10px;") + ">" + formatShowtime(showtime) + "</td></tr>" +
    "<tr><td style=" + JSON.stringify("padding:10px; font-weight:bold; color:#c0392b;") + ">Removed Seat(s)</td><td style=" + JSON.stringify("padding:10px; color:#c0392b;") + ">" + removedList + "</td></tr>" +
    "<tr style=" + JSON.stringify("background:#f9f9f9") + "><td style=" + JSON.stringify("padding:10px; font-weight:bold;") + ">Remaining Seat(s)</td><td style=" + JSON.stringify("padding:10px;") + ">" + remainingList + "</td></tr>" +
    "<tr><td style=" + JSON.stringify("padding:10px; font-weight:bold; font-size:18px;") + ">New Total</td><td style=" + JSON.stringify("padding:10px; font-size:18px; color:#e63946;") + "><strong>$" + parseFloat(newTotal).toFixed(2) + "</strong></td></tr>" +
    "</table>" +
    "<p style=" + JSON.stringify("color:#666; font-size:13px;") + ">If you believe this is a mistake, please contact our support team.</p>" +
    "</div>" +
    "<div style=" + JSON.stringify("background:#f5f5f5; padding: 16px; text-align:center; color:#999; font-size:12px;") + ">CinemaBooking &copy; 2026 - We hope to see you again soon!</div>" +
    "</div>";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Booking Updated -- " + movie + " [" + reference + "]",
    html,
  });
};

const sendBlacklistEmail = async ({ to, name }) => {
  const html = "<div style=" + JSON.stringify("font-family: Arial, sans-serif; max-width: 600px; margin: auto; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;") + ">" +
    "<div style=" + JSON.stringify("background: #7f1d1d; color: white; padding: 24px; text-align: center;") + ">" +
    "<h1 style=" + JSON.stringify("margin:0; font-size: 24px;") + ">Account Restricted</h1></div>" +
    "<div style=" + JSON.stringify("padding: 24px;") + ">" +
    "<p>Hi <strong>" + name + "</strong>,</p>" +
    "<p>Your account has been <strong>restricted</strong> because you cancelled a booking within 2 hours of the showtime.</p>" +
    "<p>While your account is restricted, you <strong>cannot make bookings directly</strong> through the system. Please visit the cinema or contact our staff to book on your behalf.</p>" +
    "<p style=" + JSON.stringify("background:#fef2f2; border-left:4px solid #ef4444; padding:12px 16px; border-radius:4px; color:#7f1d1d; font-size:14px;") + ">A staff member can lift this restriction at any time. Please contact our support team if you believe this was a mistake.</p>" +
    "</div>" +
    "<div style=" + JSON.stringify("background:#f5f5f5; padding: 16px; text-align:center; color:#999; font-size:12px;") + ">CinemaBooking &copy; 2026</div>" +
    "</div>";

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: "Account Restricted — Late Cancellation Policy",
    html,
  });
};

const sendReminderEmail = async ({ to, name, movie, showtime, hall, seats, reference }) => {
  const seatList = seats.map(s => s.row_label + s.seat_number + ' (' + s.seat_type + ')').join(', ');
  const dt = new Date(showtime);
  const dateStr = dt.toLocaleDateString('en-US', { timeZone: TIMEZONE, weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = dt.toLocaleTimeString('en-US', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' });

  const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">' +
    '<div style="background:#1a1a2e;color:white;padding:24px;text-align:center;">' +
    '<h1 style="margin:0;font-size:24px;">🎬 Your Movie is Tomorrow!</h1></div>' +
    '<div style="padding:24px;">' +
    '<p>Hi <strong>' + name + '</strong>,</p>' +
    '<p>Just a reminder — your movie is coming up <strong>tomorrow</strong>! Here are your booking details:</p>' +
    '<table style="width:100%;border-collapse:collapse;margin:16px 0;">' +
    '<tr style="background:#f9f9f9"><td style="padding:10px;font-weight:bold;">Movie</td><td style="padding:10px;">' + movie + '</td></tr>' +
    '<tr><td style="padding:10px;font-weight:bold;">Date</td><td style="padding:10px;">' + dateStr + '</td></tr>' +
    '<tr style="background:#f9f9f9"><td style="padding:10px;font-weight:bold;">Time</td><td style="padding:10px;">' + timeStr + '</td></tr>' +
    '<tr><td style="padding:10px;font-weight:bold;">Hall</td><td style="padding:10px;">' + hall + '</td></tr>' +
    '<tr style="background:#f9f9f9"><td style="padding:10px;font-weight:bold;">Seats</td><td style="padding:10px;">' + seatList + '</td></tr>' +
    '<tr><td style="padding:10px;font-weight:bold;">Reference</td><td style="padding:10px;font-family:monospace;">' + reference + '</td></tr>' +
    '</table>' +
    '<p style="color:#666;font-size:13px;">Please arrive 15 minutes early and present your reference number at the entrance.</p>' +
    '</div>' +
    '<div style="background:#f5f5f5;padding:16px;text-align:center;color:#999;font-size:12px;">CinemaBooking &copy; 2026 - See you tomorrow!</div>' +
    '</div>';

  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject: 'Reminder: ' + movie + ' is Tomorrow!', html });
};

const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">' +
    '<div style="background:#1a1a2e;color:white;padding:24px;text-align:center;">' +
    '<h1 style="margin:0;font-size:24px;">Password Reset</h1></div>' +
    '<div style="padding:24px;">' +
    '<p>Hi <strong>' + name + '</strong>,</p>' +
    '<p>We received a request to reset your password. Click the button below to set a new password:</p>' +
    '<p style="text-align:center;margin:28px 0;">' +
    '<a href="' + resetUrl + '" style="background:#2563eb;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Reset Password</a>' +
    '</p>' +
    '<p style="color:#666;font-size:13px;">This link will expire in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email — your account remains secure.</p>' +
    '</div>' +
    '<div style="background:#f5f5f5;padding:16px;text-align:center;color:#999;font-size:12px;">CinemaBooking &copy; 2026</div>' +
    '</div>';

  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject: 'Reset Your Password — CinemaBooking', html });
};

const sendBookingModifiedEmail = async ({ to, name, reference, movie, showtime, oldSeats, newSeats, newTotal }) => {
  const oldList = oldSeats.map(s => s.row_label + s.seat_number + ' (' + s.seat_type + ')').join(', ');
  const newList = newSeats.map(s => s.row_label + s.seat_number + ' (' + s.seat_type + ')').join(', ');

  const html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">' +
    '<div style="background:#0369a1;color:white;padding:24px;text-align:center;">' +
    '<h1 style="margin:0;font-size:24px;">Seats Updated</h1></div>' +
    '<div style="padding:24px;">' +
    '<p>Hi <strong>' + name + '</strong>,</p>' +
    '<p>Your seat selection has been updated successfully. Here is a summary:</p>' +
    '<table style="width:100%;border-collapse:collapse;margin:16px 0;">' +
    '<tr style="background:#f9f9f9"><td style="padding:10px;font-weight:bold;">Reference</td><td style="padding:10px;font-family:monospace;">' + reference + '</td></tr>' +
    '<tr><td style="padding:10px;font-weight:bold;">Movie</td><td style="padding:10px;">' + movie + '</td></tr>' +
    '<tr style="background:#f9f9f9"><td style="padding:10px;font-weight:bold;">Showtime</td><td style="padding:10px;">' + formatShowtime(showtime) + '</td></tr>' +
    '<tr><td style="padding:10px;font-weight:bold;color:#dc2626;">Old Seats</td><td style="padding:10px;color:#dc2626;text-decoration:line-through;">' + oldList + '</td></tr>' +
    '<tr style="background:#f9f9f9"><td style="padding:10px;font-weight:bold;color:#16a34a;">New Seats</td><td style="padding:10px;color:#16a34a;font-weight:bold;">' + newList + '</td></tr>' +
    '<tr><td style="padding:10px;font-weight:bold;font-size:18px;">New Total</td><td style="padding:10px;font-size:18px;color:#e63946;"><strong>$' + parseFloat(newTotal).toFixed(2) + '</strong></td></tr>' +
    '</table>' +
    '<p style="color:#666;font-size:13px;">Please present your reference number at the cinema entrance.</p>' +
    '</div>' +
    '<div style="background:#f5f5f5;padding:16px;text-align:center;color:#999;font-size:12px;">CinemaBooking &copy; 2026</div>' +
    '</div>';

  await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject: 'Seats Updated — ' + movie + ' [' + reference + ']', html });
};

module.exports = { sendBookingConfirmation, sendCancellationEmail, sendWaitlistNotification, sendSeatRemovalEmail, sendBlacklistEmail, sendReminderEmail, sendPasswordResetEmail, sendBookingModifiedEmail };

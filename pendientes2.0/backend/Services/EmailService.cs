using System.Net;
using System.Net.Mail;

namespace Backend.Services;

public interface IEmailService
{
    Task<bool> SendEmailAsync(string to, string subject, string body, string? ccEmails = null);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendEmailAsync(string to, string subject, string body, string? ccEmails = null)
    {
        var smtpServer = _configuration["Email:SmtpServer"] ?? "smtp.gmail.com";
        var smtpPort = int.Parse(_configuration["Email:SmtpPort"] ?? "587");
        var senderEmail = _configuration["Email:SenderEmail"] ?? "";
        var senderPassword = _configuration["Email:SenderPassword"] ?? "";

        if (string.IsNullOrEmpty(senderEmail) || string.IsNullOrEmpty(senderPassword))
        {
            _logger.LogWarning("Email credentials not configured.");
            return false;
        }

        try
        {
            using var client = new SmtpClient(smtpServer, smtpPort)
            {
                Credentials = new NetworkCredential(senderEmail, senderPassword),
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(senderEmail),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            mailMessage.To.Add(to);

            if (!string.IsNullOrEmpty(ccEmails))
            {
                var ccList = ccEmails.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var cc in ccList)
                {
                    if (!string.IsNullOrWhiteSpace(cc))
                    {
                        mailMessage.CC.Add(cc.Trim());
                    }
                }
            }

            await client.SendMailAsync(mailMessage);
            _logger.LogInformation($"Correo enviado a {to} (CC: {ccEmails ?? "none"})");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enviando correo");
            return false;
        }
    }
}

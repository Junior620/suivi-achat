"""
Service d'envoi d'emails
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional
import logging
import os

logger = logging.getLogger(__name__)


class EmailService:
    """Service pour envoyer des emails"""
    
    def __init__(self):
        self.smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.from_email = os.getenv("FROM_EMAIL", self.smtp_user)
        self.from_name = os.getenv("FROM_NAME", "CocoaTrack")
    
    def send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        attachments: Optional[List[tuple]] = None
    ) -> bool:
        """
        Envoyer un email
        
        Args:
            to_emails: Liste des destinataires
            subject: Sujet de l'email
            html_content: Contenu HTML
            attachments: Liste de tuples (filename, content)
        """
        if not self.smtp_user or not self.smtp_password:
            logger.warning("Configuration SMTP manquante, email non envoyé")
            return False
        
        try:
            # Créer le message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = ", ".join(to_emails)
            
            # Ajouter le contenu HTML
            html_part = MIMEText(html_content, "html", "utf-8")
            msg.attach(html_part)
            
            # Ajouter les pièces jointes
            if attachments:
                for filename, content in attachments:
                    attachment = MIMEApplication(content)
                    attachment.add_header("Content-Disposition", "attachment", filename=filename)
                    msg.attach(attachment)
            
            # Envoyer l'email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"Email envoyé à {', '.join(to_emails)}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi de l'email: {str(e)}")
            return False
    
    def send_report_email(
        self,
        to_emails: List[str],
        report_data: dict,
        pdf_content: Optional[bytes] = None
    ) -> bool:
        """Envoyer un email de rapport"""
        subject = self._generate_report_subject(report_data)
        html_content = self._generate_report_html(report_data)
        
        attachments = []
        if pdf_content:
            filename = f"rapport_{report_data['period']}_{report_data['start_date']}.pdf"
            attachments.append((filename, pdf_content))
        
        return self.send_email(to_emails, subject, html_content, attachments)
    
    def _generate_report_subject(self, report_data: dict) -> str:
        """Générer le sujet de l'email"""
        period_name = "Hebdomadaire" if report_data["period"] == "weekly" else "Mensuel"
        return f"📊 Rapport {period_name} CocoaTrack - {report_data['start_date']}"
    
    def _generate_report_html(self, report_data: dict) -> str:
        """Générer le contenu HTML de l'email"""
        current = report_data["current"]
        comparisons = report_data["comparisons"]
        
        def format_change(value: float) -> str:
            """Formater le changement avec couleur"""
            if value > 0:
                return f'<span style="color: #10b981;">↗ +{value:.1f}%</span>'
            elif value < 0:
                return f'<span style="color: #ef4444;">↘ {value:.1f}%</span>'
            else:
                return '<span style="color: #6b7280;">→ 0%</span>'
        
        # Générer la liste des alertes
        alerts_html = ""
        if report_data["alerts"]:
            alerts_html = "<h3>⚠️ Alertes</h3><ul>"
            for alert in report_data["alerts"]:
                color = "#f59e0b" if alert["severity"] == "warning" else "#3b82f6"
                alerts_html += f'<li style="color: {color};">{alert["message"]}</li>'
            alerts_html += "</ul>"
        
        # Générer le top planteurs
        top_planters_html = "<h3>🏆 Top 10 Planteurs</h3><table style='width: 100%; border-collapse: collapse;'>"
        top_planters_html += "<tr style='background: #f3f4f6;'><th style='padding: 8px; text-align: left;'>Rang</th><th style='padding: 8px; text-align: left;'>Nom</th><th style='padding: 8px; text-align: right;'>Volume (kg)</th><th style='padding: 8px; text-align: right;'>Livraisons</th></tr>"
        
        for i, planter in enumerate(report_data["top_planters"], 1):
            top_planters_html += f"""
            <tr style='border-bottom: 1px solid #e5e7eb;'>
                <td style='padding: 8px;'>{i}</td>
                <td style='padding: 8px;'>{planter['name']}</td>
                <td style='padding: 8px; text-align: right;'>{planter['total_volume']:,.0f}</td>
                <td style='padding: 8px; text-align: right;'>{planter['delivery_count']}</td>
            </tr>
            """
        top_planters_html += "</table>"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: white; padding: 30px; border: 1px solid #e5e7eb; }}
                .kpi {{ background: #f9fafb; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }}
                .kpi-title {{ font-size: 14px; color: #6b7280; margin-bottom: 5px; }}
                .kpi-value {{ font-size: 28px; font-weight: bold; color: #111827; }}
                .footer {{ background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-radius: 0 0 10px 10px; }}
                table {{ margin: 15px 0; }}
                th {{ font-weight: 600; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Rapport {report_data['period'].title()}</h1>
                    <p>Du {report_data['start_date']} au {report_data['end_date']}</p>
                </div>
                
                <div class="content">
                    <h2>📈 Indicateurs Clés</h2>
                    
                    <div class="kpi">
                        <div class="kpi-title">Volume Total</div>
                        <div class="kpi-value">{current['total_volume']:,.0f} kg</div>
                        <div>{format_change(comparisons['volume_change'])} vs période précédente</div>
                    </div>
                    
                    <div class="kpi">
                        <div class="kpi-title">Nombre de Livraisons</div>
                        <div class="kpi-value">{current['total_deliveries']}</div>
                        <div>{format_change(comparisons['deliveries_change'])} vs période précédente</div>
                    </div>
                    
                    <div class="kpi">
                        <div class="kpi-title">Planteurs Actifs</div>
                        <div class="kpi-value">{current['active_planters']}</div>
                        <div>{format_change(comparisons['planters_change'])} vs période précédente</div>
                    </div>
                    
                    <div class="kpi">
                        <div class="kpi-title">Paiements Effectués</div>
                        <div class="kpi-value">{current['total_payments']:,.0f} FCFA</div>
                        <div>{format_change(comparisons['payments_change'])} vs période précédente</div>
                    </div>
                    
                    <div class="kpi">
                        <div class="kpi-title">Qualité Moyenne</div>
                        <div class="kpi-value">{current['avg_quality']:.1f}/10</div>
                    </div>
                    
                    {top_planters_html}
                    
                    {alerts_html}
                    
                    <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        📎 Le rapport détaillé est disponible en pièce jointe (PDF).
                    </p>
                </div>
                
                <div class="footer">
                    <p>CocoaTrack - Système de Gestion du Cacao</p>
                    <p>Généré automatiquement le {report_data['generated_at']}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return html

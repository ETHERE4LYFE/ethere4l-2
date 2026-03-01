// =========================================================
// SERVICE: Email — Resend integration + all email sending
// =========================================================
// No Express req/res. Pure business logic.
// =========================================================

const { Resend } = require('resend');
const { RESEND_API_KEY, ADMIN_EMAIL, SENDER_EMAIL, FRONTEND_URL } = require('../../config/env');
const { logger, incrementErrorCount } = require('../../utils/logger');
const { generateOrderToken } = require('../../utils/helpers');
const { buildPDF } = require('../../../utils/pdfGenerator');
const {
    getEmailTemplate,
    getPaymentConfirmedEmail,
    getMagicLinkEmail
} = require('../../../utils/emailTemplates');

// Initialize Resend
let resend = null;
if (RESEND_API_KEY) {
    resend = new Resend(RESEND_API_KEY);
    console.log('📧 Sistema de correos ACTIVO');
} else {
    console.warn('⚠️ SIN API KEY DE RESEND - Correos desactivados');
}

function isConfigured() {
    return !!resend;
}

async function sendMagicLinkEmail(email, link) {
    if (!resend) {
        logger.warn('MAGIC_LINK_RESEND_NOT_CONFIGURED', { email });
        return null;
    }

    const result = await resend.emails.send({
        from: `ETHERE4L <${SENDER_EMAIL}>`,
        to: [email],
        subject: "Accede a tus pedidos – ETHERE4L",
        html: getMagicLinkEmail(link)
    });

    logger.info('MAGIC_LINK_SENT', {
        email,
        resendId: result?.id || 'unknown'
    });

    return result;
}

async function sendOrderConfirmationEmails(orderId, cliente, pedido) {
    try {
        logger.info('EMAIL_PROCESS_START', { orderId, email: cliente.email, resendConfigured: !!resend });

        const pdfBuffer = await buildPDF(cliente, pedido, orderId, 'CLIENTE');
        logger.info('PDF_GENERATED', { orderId, pdfSize: pdfBuffer.length });

        const accessToken = generateOrderToken(orderId, cliente.email);
        const trackingUrl = `${FRONTEND_URL}/pedido-ver.html?id=${orderId}&token=${accessToken}`;

        if (resend) {
            // Client email
            try {
                const clientEmailRes = await resend.emails.send({
                    from: `ETHERE4L <${SENDER_EMAIL}>`,
                    to: [cliente.email],
                    subject: `Confirmación de Pedido ${orderId.slice(-6)}`,
                    html: getPaymentConfirmedEmail(cliente, pedido, orderId, trackingUrl),
                    attachments: [
                        { filename: `Orden_${orderId.slice(-6)}.pdf`, content: pdfBuffer }
                    ]
                });

                logger.info('CLIENT_EMAIL_SENT', {
                    orderId,
                    email: cliente.email,
                    resendId: clientEmailRes?.id || 'unknown'
                });
            } catch (clientEmailErr) {
                logger.error('CLIENT_EMAIL_FAILED', {
                    orderId,
                    email: cliente.email,
                    error: clientEmailErr.message,
                    statusCode: clientEmailErr.statusCode || 'N/A'
                });
            }

            // Admin email
            if (ADMIN_EMAIL) {
                try {
                    const adminEmailRes = await resend.emails.send({
                        from: `System <${SENDER_EMAIL}>`,
                        to: [ADMIN_EMAIL],
                        subject: `💰 NUEVA VENTA - ${orderId.slice(-6)}`,
                        html: getEmailTemplate(cliente, pedido, orderId, true),
                        attachments: [
                            { filename: `Orden_${orderId.slice(-6)}.pdf`, content: pdfBuffer }
                        ]
                    });

                    logger.info('ADMIN_EMAIL_SENT', {
                        orderId,
                        resendId: adminEmailRes?.id || 'unknown'
                    });
                } catch (adminEmailErr) {
                    logger.error('ADMIN_EMAIL_FAILED', {
                        orderId,
                        error: adminEmailErr.message
                    });
                }
            }
        } else {
            logger.warn('RESEND_NOT_CONFIGURED_SKIPPING_EMAILS', { orderId });
        }
    } catch (e) {
        logger.error('EMAIL_PDF_ERROR', { orderId, error: e.message, stack: e.stack });
        incrementErrorCount();
    }
}

async function sendShippingUpdateEmail(email, orderId, status, statusDescription, trackingNumber) {
    if (!resend) return;

    try {
        await resend.emails.send({
            from: `ETHERE4L <${SENDER_EMAIL}>`,
            to: [email],
            subject: `Actualización de tu pedido`,
            html: `
                <h2>Estado actualizado</h2>
                <p><strong>${statusDescription}</strong></p>
                <p>Pedido: ${orderId}</p>
                ${trackingNumber ? `<p>Guía: ${trackingNumber}</p>` : ''}
            `
        });
    } catch (emailErr) {
        logger.error('SHIPPING_UPDATE_EMAIL_FAILED', { orderId, error: emailErr.message });
    }
}

module.exports = {
    isConfigured,
    sendMagicLinkEmail,
    sendOrderConfirmationEmails,
    sendShippingUpdateEmail
};

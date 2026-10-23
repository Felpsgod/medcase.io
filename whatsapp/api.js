
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerm = require('qrcode-terminal');
const qrcodeHtml = require('qrcode');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORTA_ZAP = 3005;

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "cliente_zap"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-extensions',
            '--disable-default-apps',
            '--disable-sync',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-component-update',
            '--disable-client-side-phishing-detection',
            '--no-first-run',
            '--no-zygote',
            '--disable-logging',
            '--log-level=3',
            '--ignore-certificate-errors',
            '--allow-running-insecure-content'
        ],
        timeout: 60000,
    }
});

let zapPronto = false;
let lastQrCode = null;

// ============================================
// EVENTOS DO CLIENT
// ============================================

client.on('qr', (qr) => {
    console.log('📱 ESCANEIE O QR CODE:');
    qrcodeTerm.generate(qr, { small: true });
    lastQrCode = qr;
});

client.on('ready', () => {
    console.log('✅ ROBÔ CONECTADO!');
    zapPronto = true;
    lastQrCode = null;
});

client.on('authenticated', () => {
    console.log('🔐 Autenticado!');
});

client.on('auth_failure', msg => {
    console.error('❌ Falha na autenticação:', msg);
    zapPronto = false;
});

client.on('disconnected', (reason) => {
    console.log('💔 Desconectado:', reason);
    zapPronto = false;
});

// ============================================
// OUVIR MENSAGENS EM TEMPO REAL
// ============================================

client.on('message', async (message) => {
    console.log('📨 NOVA MENSAGEM RECEBIDA:');
    console.log('   De:', message.from);
    console.log('   Corpo:', message.body);
    console.log('   Tipo:', message.type);
    console.log('   Hora:', new Date(message.timestamp * 1000).toLocaleString());
    
    // Exemplo: Responder automaticamente se for "oi"
    if (message.body.toLowerCase() === 'oi') {
        await message.reply('Olá! Sou um robô. Como posso ajudar?');
    }
});

// ============================================
// ROTAS DA API
// ============================================

// Rota do QR Code
app.get('/qr', async (req, res) => {
    if (zapPronto) {
        return res.send('<h2>Robô conectado! ✅</h2>');
    }
    if (lastQrCode) {
        try {
            const qrImage = await qrcodeHtml.toDataURL(lastQrCode);
            res.send(`
                <h2>Escaneie o QR Code</h2>
                <img src="${qrImage}" style="width: 300px;">
            `);
        } catch (err) {
            res.send("Erro ao gerar QR Code");
        }
    } else {
        res.send('<h2>Aguardando QR Code...</h2>');
    }
});

// ============================================
// ROTAS PARA LER MENSAGENS
// ============================================

// 1. Listar todas as conversas/chats
app.get('/chats', async (req, res) => {
    if (!zapPronto) {
        return res.status(503).json({ error: "WhatsApp não conectado" });
    }

    try {
        const chats = await client.getChats();
        
        const chatsInfo = chats.map(chat => ({
            id: chat.id._serialized,
            nome: chat.name || chat.contact?.name || chat.contact?.pushname || chat.id.user,
            tipo: chat.isGroup ? 'grupo' : 'privado',
            nao_lidas: chat.unreadCount || 0,
            ultima_mensagem: chat.lastMessage?.body || 'Nenhuma',
            ultima_atualizacao: new Date(chat.timestamp * 1000).toLocaleString()
        }));

        res.json({ 
            total: chats.length,
            chats: chatsInfo 
        });

    } catch (error) {
        console.error('Erro ao buscar chats:', error);
        res.status(500).json({ error: "Erro ao buscar conversas" });
    }
});

// 2. Buscar mensagens de uma conversa específica
app.get('/mensagens/:chatId', async (req, res) => {
    if (!zapPronto) {
        return res.status(503).json({ error: "WhatsApp não conectado" });
    }

    const { chatId } = req.params;
    const limite = parseInt(req.query.limite) || 20; // Padrão: 20 mensagens

    try {
        // Decodificar o chatId (pode vir com caracteres especiais na URL)
        const decodedChatId = decodeURIComponent(chatId);
        
        // Buscar o chat
        const chat = await client.getChatById(decodedChatId);
        
        // Buscar mensagens
        const messages = await chat.fetchMessages({ limit: limite });
        
        const mensagensFormatadas = messages.map(msg => ({
            id: msg.id.id,
            de: msg.from,
            de_contato: msg.fromMe ? 'EU' : 'CONTATO',
            corpo: msg.body,
            tipo: msg.type,
            data: new Date(msg.timestamp * 1000).toLocaleString(),
            lida: msg.hasOwnProperty('ack') ? msg.ack > 0 : null,
            entregue: msg.hasOwnProperty('ack') ? msg.ack > 1 : null,
            visualizada: msg.hasOwnProperty('ack') ? msg.ack > 2 : null,
            citou_msg: msg.hasQuotedMsg ? true : false
        }));

        res.json({
            chat: {
                id: chat.id._serialized,
                nome: chat.name || chat.contact?.name || chat.id.user,
                tipo: chat.isGroup ? 'grupo' : 'privado',
                participantes: chat.participants?.length || null
            },
            total_mensagens: mensagensFormatadas.length,
            mensagens: mensagensFormatadas
        });

    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
});

// 3. Busar mensagens não lidas
app.get('/nao-lidas', async (req, res) => {
    if (!zapPronto) {
        return res.status(503).json({ error: "WhatsApp não conectado" });
    }

    try {
        const chats = await client.getChats();
        const chatsComNaoLidas = [];
        
        for (const chat of chats) {
            if (chat.unreadCount > 0) {
                const messages = await chat.fetchMessages({ limit: chat.unreadCount });
                
                chatsComNaoLidas.push({
                    chat: {
                        id: chat.id._serialized,
                        nome: chat.name || chat.contact?.name || chat.id.user,
                        nao_lidas: chat.unreadCount
                    },
                    mensagens: messages.map(msg => ({
                        corpo: msg.body,
                        de: msg.fromMe ? 'EU' : 'CONTATO',
                        data: new Date(msg.timestamp * 1000).toLocaleString()
                    }))
                });
            }
        }

        res.json({
            total_chats_nao_lidas: chatsComNaoLidas.length,
            chats: chatsComNaoLidas
        });

    } catch (error) {
        console.error('Erro ao buscar não lidas:', error);
        res.status(500).json({ error: "Erro ao buscar mensagens não lidas" });
    }
});

// 4. Buscar mensagens de um número específico (mais simples)
app.get('/conversa/:numero', async (req, res) => {
    if (!zapPronto) {
        return res.status(503).json({ error: "WhatsApp não conectado" });
    }

    let { numero } = req.params;
    const limite = parseInt(req.query.limite) || 20;

    try {
        // Limpar número
        let numeroLimpo = numero.replace(/\D/g, '');
        if (!numeroLimpo.startsWith('55')) numeroLimpo = '55' + numeroLimpo;

        // Buscar ID do número
        const numberDetails = await client.getNumberId(numeroLimpo);
        
        if (!numberDetails) {
            return res.status(404).json({ error: "Número não encontrado ou sem WhatsApp" });
        }

        // Buscar chat
        const chat = await client.getChatById(numberDetails._serialized);
        
        // Buscar mensagens
        const messages = await chat.fetchMessages({ limit: limite });

        res.json({
            numero: numero,
            numero_formatado: numeroLimpo,
            chat_id: chat.id._serialized,
            mensagens: messages.map(msg => ({
                eu: msg.fromMe,
                texto: msg.body,
                quando: new Date(msg.timestamp * 1000).toLocaleString()
            }))
        });

    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: "Erro ao buscar conversa" });
    }
});

// ============================================
// ROTA PARA ENVIAR MENSAGEM (que você já tinha)
// ============================================

app.post('/enviar', async (req, res) => {
    if (!zapPronto) {
        return res.status(503).json({ error: "WhatsApp não conectado" });
    }

    let { numero, mensagem } = req.body;

    if (!numero || !mensagem) {
        return res.status(400).json({ error: "Número e mensagem obrigatórios" });
    }

    let numeroLimpo = numero.replace(/\D/g, '');
    if (!numeroLimpo.startsWith('55')) numeroLimpo = '55' + numeroLimpo;

    try {
        const numberDetails = await client.getNumberId(numeroLimpo);

        if (!numberDetails) {
            return res.status(400).json({ error: "Número não possui WhatsApp" });
        }

        await client.sendMessage(numberDetails._serialized, mensagem);
        console.log(`✉️ Mensagem enviada para: ${numeroLimpo}`);
        
        res.json({ success: true, message: "Enviado!" });

    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ error: "Falha no envio" });
    }
});

// ============================================
// INICIAR SERVIDOR
// ============================================

setTimeout(() => {
    client.initialize().catch(err => {
        console.error('Erro na inicialização:', err);
    });
}, 1000);

app.listen(PORTA_ZAP, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA_ZAP}`);
    console.log('📚 ROTAS DISPONÍVEIS:');
    console.log('   GET  /qr - Ver QR Code');
    console.log('   GET  /chats - Listar conversas');
    console.log('   GET  /mensagens/:chatId - Ver mensagens de um chat');
    console.log('   GET  /nao-lidas - Ver mensagens não lidas');
    console.log('   GET  /conversa/:numero - Ver conversa por número');
    console.log('   POST /enviar - Enviar mensagem');
});


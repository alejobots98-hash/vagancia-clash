require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
} = require("discord.js");

const discordTranscripts = require("discord-html-transcripts");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ===================== CONFIGURACIÓN =====================
// ¡RECUERDA CAMBIAR ESTAS IDS POR LAS DE TU SERVIDOR!
const PREFIX = "!duelo"; 
const CREAR_FILA_ROLE_ID = "1486959938038136912"; // Rol que puede usar !duelo
const STAFF_ROLE_ID = "1476541425263968391";      // Rol Staff para ver canales privados
const EXTRA_MOD_ROLE_ID = "1211760228673257524";   // Rol Mod extra para ver canales privados
const LOG_CHANNEL_ID = "1486176116413825206";      // Canal donde se envían los transcripts

// Base de datos temporal para guardar el estado de las filas
const estadosFilas = new Map();

// ===================== EMOJIS (Clash Royale Style) =====================
// Emojis estándar para usar en el Embed si no tienes personalizados.
const EMOJI_SWORDS = "⚔️";
const EMOJI_ELIXIR = "🧪";
const EMOJI_MONEY = "💰";
const EMOJI_ARENA = "🏟️";

// URL DEL LOGO VG CLAN ARENA (Sacado de la imagen proporcionada)
const LOGO_VG_URL = "https://i.imgur.com/NAKqQ4W.jpeg"; 

// ===================== EMBED DE PAGOS (Dentro del Canal Privado) =====================
function embedPagos() {
  return new EmbedBuilder()
    .setColor(0x54a5f1) // Azul Clash Royale
    .setTitle(`${EMOJI_MONEY} MÉTODOS DE PAGO & REGLAS`)
    .setDescription(
`━━━━━━━━━━━━━━━━━━
**MÉTODOS DISPONIBLES**

🏦 **Naranja X**
┗ 👤 Alejo German Tolosa  
┗ 🔗 Alias: \`vg.apos\`

🌐 **AstroPay**
┗ 🔗 https://onetouch.astropay.com/payment?external_reference_id=8lIV0oqyplqnZulPqVirFZbTf2rkhLsR

💎 **Binance**
┗ 🆔 ID: \`729592524\`

━━━━━━━━━━━━━━━━━━
**REGLAS DEL DUELO**
1️⃣ Nivel de cartas: **Nivel 11 (Reglas de Torneo)**.
2️⃣ Prohibido el uso de torres de tropas si no se pactó.
3️⃣ La comisión se descuenta del pozo final.

💰 **COMISIONES**
🟢 Comisión fija de **400 ARS** en Discord
⚠️ Fuera de Discord → **10% del monto**
━━━━━━━━━━━━━━━━━━`
    )
    .setFooter({ 
      text: "VAGANCIA • ARENA SYSTEM",
      iconURL: LOGO_VG_URL
    });
}

// ===================== EMBED FILA (VISTA PÚBLICA) =====================
// ESTE ES EL EMBED QUE SE VE IGUAL A TU IMAGEN DE EJEMPLO
function crearEmbedFila(data = { f1: null, f2: null, f3: null }) {
  // Estado de los jugadores en la fila
  const p1 = data.f1 ? `<@${data.f1}>` : "*Buscando oponente...*";
  const p2 = data.f2 ? `<@${data.f2}>` : "*Buscando oponente...*";
  const p3 = data.f3 ? `<@${data.f3}>` : "*Buscando oponente...*";

  return new EmbedBuilder()
    .setColor(0xFFA500) // Color naranja/dorado de la barra lateral
    .setTitle(`${EMOJI_ELIXIR} | ¿QUIÉN ESTÁ LISTO PARA UN DUELO?`)
    .setThumbnail(LOGO_VG_URL) // El logo VG Clan Arena a la derecha
    .setDescription(
`**Modalidad:** Apostado 🛡️
**Torre:** Nivel de cartas a 11 (Torneo)

**Arenas Disponibles:**
${EMOJI_SWORDS} **Arena 1:** ${p1}
${EMOJI_SWORDS} **Arena 2:** ${p2}
${EMOJI_SWORDS} **Arena 3:** ${p3}

*Haz clic en el botón para entrar a la Arena.*`
    )
    .setFooter({ 
      text: "CLASH GAMING • El sistema de los guerreros",
      iconURL: LOGO_VG_URL // Logo pequeñito en el footer
    });
}

// ===================== BOTONES DE FILA (VISTA PÚBLICA) =====================
function botonesTripleFila() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_f1").setLabel("Arena 1").setEmoji("⚔️").setStyle(ButtonStyle.Secondary), // Estilo gris como en la imagen
    new ButtonBuilder().setCustomId("btn_f2").setLabel("Arena 2").setEmoji("⚔️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("btn_f3").setLabel("Arena 3").setEmoji("⚔️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("salir_fila").setLabel("Levantarse").setEmoji("🚫").setStyle(ButtonStyle.Danger) // Botón rojo
  );
}

// ===================== EVENTO MENSAJE (Comando !duelo) =====================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  // Verificar permisos
  const esAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const tieneRol = message.member.roles.cache.has(CREAR_FILA_ROLE_ID);

  if (!esAdmin && !tieneRol) return message.reply("❌ No tienes permisos para abrir la Arena.");

  // Enviar el Embed y los botones
  const msg = await message.channel.send({
    embeds: [crearEmbedFila()],
    components: [botonesTripleFila()],
  });

  // Inicializar el estado de esta fila
  estadosFilas.set(msg.id, { f1: null, f2: null, f3: null });
});

// ===================== EVENTO INTERACCIÓN (Botones) =====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  // --- LÓGICA PARA CERRAR EL CANAL DE COMBATE ---
  if (interaction.customId === "cerrar_partida") {
    const puedeCerrar = interaction.member.roles.cache.has(STAFF_ROLE_ID) || 
                        interaction.member.roles.cache.has(EXTRA_MOD_ROLE_ID) ||
                        interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!puedeCerrar) {
      return interaction.reply({ content: "❌ Solo un árbitro/staff puede finalizar la Arena.", ephemeral: true });
    }
    
    const canalDestino = interaction.channel;
    await interaction.reply({ content: "⏳ Generando transcript y cerrando arena...", ephemeral: true });
    
    // Generar el Transcript (copia de seguridad del chat)
    try {
      const attachment = await discordTranscripts.createTranscript(canalDestino, {
        limit: -1, fileName: `duelo-${canalDestino.name}.html`, saveImages: true, poweredBy: false,
      });
      const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        await logChannel.send({
          content: `📜 **Duelo Finalizado**\nCanal: \`${canalDestino.name}\`\nCerrado por: <@${interaction.user.id}>`,
          files: [attachment],
        });
      }
    } catch (e) { console.error("Error al generar transcript:", e); }

    // Borrar el canal después de 3 segundos
    setTimeout(async () => {
      try {
        if (canalDestino && canalDestino.deletable) {
          await canalDestino.delete();
        }
      } catch (err) {
        console.log("El canal ya fue borrado o no se pudo encontrar.");
      }
    }, 3000);
    return;
  }

  // --- LÓGICA DE UNIRSE/SALIR DE LAS ARENAS ---
  const data = estadosFilas.get(interaction.message.id);
  if (!data) return interaction.reply({ content: "❌ Error: Esta arena ya no está activa.", ephemeral: true });

  const userId = interaction.user.id;

  // Botón "Levantarse" (Salir de la fila)
  if (interaction.customId === "salir_fila") {
    let cambio = false;
    if (data.f1 === userId) { data.f1 = null; cambio = true; }
    if (data.f2 === userId) { data.f2 = null; cambio = true; }
    if (data.f3 === userId) { data.f3 = null; cambio = true; }
    
    if (cambio) {
        return await interaction.update({ embeds: [crearEmbedFila(data)] });
    } else {
        return interaction.reply({ content: "⚠️ No estás en ninguna arena.", ephemeral: true });
    }
  }

  // Botones de Arena (1, 2, 3)
  const mapping = { "btn_f1": "f1", "btn_f2": "f2", "btn_f3": "f3" };
  const filaKey = mapping[interaction.customId];
  if (!filaKey) return;

  // Verificar si el usuario ya está en OTRA arena
  if (data.f1 === userId || data.f2 === userId || data.f3 === userId) {
    if (data[filaKey] !== userId) {
        return interaction.reply({ content: "⚠️ Ya estás esperando en otra arena.", ephemeral: true });
    }
  }

  // Si la arena está vacía, el usuario se une
  if (!data[filaKey]) {
    data[filaKey] = userId;
    await interaction.update({ embeds: [crearEmbedFila(data)] });
  } 
  // Si la arena ya tiene a alguien, empieza el duelo
  else {
    if (data[filaKey] === userId) return interaction.reply({ content: "⚠️ Ya estás en esta arena.", ephemeral: true });
    
    const rivalId = data[filaKey];
    data[filaKey] = null; // Vaciar la arena en el Embed público

    // Actualizar el Embed público (vaciar la arena)
    await interaction.update({ embeds: [crearEmbedFila(data)] });

    // Crear el canal privado para el duelo
    await crearCanalPrivado(interaction, [rivalId, userId]);
  }
});

// ===================== FUNCIÓN: CREAR CANAL PRIVADO DE COMBATE =====================
async function crearCanalPrivado(interaction, jugadores) {
  const guild = interaction.guild;
  const parent = interaction.channel.parent; // Crear el canal en la misma categoría

  // Generar nombre del canal basado en los usernames (limpio)
  const nombres = jugadores
    .map((id) => guild.members.cache.get(id)?.user.username || "guerrero")
    .join("-vs-")
    .toLowerCase().replace(/[^a-z0-9\-]/g, "").slice(0, 80);

  // Crear el canal de texto
  const canal = await guild.channels.create({
    name: `🔥┃cr-${nombres}`,
    type: ChannelType.GuildText,
    parent,
    permissionOverwrites: [
      // Denegar ver canal a todos (@everyone)
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      // Permitir Staff y Mods
      { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: EXTRA_MOD_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      // Permitir a los dos jugadores
      ...jugadores.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] })),
    ],
  });

  // Embed de bienvenida al combate
  const embedMatch = new EmbedBuilder()
    .setColor(0xc21807) // Rojo intenso
    .setTitle("🔥 ¡EL DUELO COMIENZA!")
    .setThumbnail(LOGO_VG_URL)
    .setDescription(
`⚔️ **CONTRINCANTES**
<@${jugadores[0]}> **VS** <@${jugadores[1]}>

━━━━━━━━━━━━━━━━━━
**INSTRUCCIONES DE ARENA:**
1. Intercambien sus **IDs de jugador** o **Link de Amistad**.
2. Realicen el pago de la apuesta y envíen captura aquí.
3. Un árbitro (<@&${STAFF_ROLE_ID}>) validará el duelo.
━━━━━━━━━━━━━━━━━━`
    )
    .setFooter({ text: "VAGANCIA ARENA • Esperando validación de Staff..." });

  // Enviar mensaje de inicio, Embed y botón de cerrar
  await canal.send({ 
    content: `${jugadores.map(id => `<@${id}>`).join(" ")} | <@&${STAFF_ROLE_ID}> un nuevo duelo de Clash Royale requiere atención.`, 
    embeds: [embedMatch], 
    components: [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("cerrar_partida").setLabel("FINALIZAR ARENA").setEmoji("🏆").setStyle(ButtonStyle.Danger)
        )
    ]
  });

  // Enviar el Embed de métodos de pago
  await canal.send({ embeds: [embedPagos()] });
}

// ===================== INICIAR EL BOT =====================
client.once("ready", () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`⚔️  Bot de Clash Royale listo.`);
  console.log(`🤖  Conectado como: ${client.user.tag}`);
  console.log(`📝  Prefijo: ${PREFIX}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
});

// Login con el token guardado en .env
client.login(process.env.TOKEN);
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
const PREFIX = "!duelo"; 
const CREAR_FILA_ROLE_ID = "1486959938038136912"; 
const STAFF_ROLE_ID = "1476541425263968391";      
const EXTRA_MOD_ROLE_ID = "1211760228673257524";   
const LOG_CHANNEL_ID = "1486176116413825206";      

const estadosFilas = new Map();

// ===================== EMOJIS PERSONALIZADOS =====================
const EMOJI_TITULO = "<a:clash_goblin_win:1400787304200802374>";
const EMOJI_ARENA_LISTA = "<:trapclashroyale:1377134494494097430>";
const EMOJI_MONEY = "💰";

// TU LINK DIRECTO DE LOGO
const LOGO_VG_URL = "https://cdn.discordapp.com/attachments/1348076763044909077/1496327989250490408/Gemini_Generated_Image_65qvvq65qvvq65qv-removebg-preview.png?ex=69e97b89&is=69e82a09&hm=98d34a683b08a5f47644700d2218339c4acdeea1ca6a0a2ac9bb27e51583b82d&";

// ===================== EMBED PAGOS =====================
function embedPagos() {
  return new EmbedBuilder()
    .setColor(0x54a5f1)
    .setTitle(`${EMOJI_MONEY} MÉTODOS DE PAGO & REGLAS`)
    .setDescription(
`━━━━━━━━━━━━━━━━━━
**MÉTODOS DISPONIBLES**

🏦 **Mercado Pago**
┗ 👤 Amanda Ines Rojas  
┗ 🔗 Alias: \`029.amanda.docena.mp\`

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
function crearEmbedFila(data = { f1: null, f2: null, f3: null }) {
  const p1 = data.f1 ? `<@${data.f1}>` : "*Buscando oponente...*";
  const p2 = data.f2 ? `<@${data.f2}>` : "*Buscando oponente...*";
  const p3 = data.f3 ? `<@${data.f3}>` : "*Buscando oponente...*";

  return new EmbedBuilder()
    .setColor(0xFFA500) 
    .setTitle(`${EMOJI_TITULO} | ¿QUIÉN ESTÁ LISTO PARA UN DUELO?`)
    .setThumbnail(LOGO_VG_URL) 
    .setDescription(
`**Modalidad:** Apostado 🛡️
**Torre:** Nivel de cartas a 11 (Torneo)

**Arenas Disponibles:**
${EMOJI_ARENA_LISTA} **Arena 1:** ${p1}
${EMOJI_ARENA_LISTA} **Arena 2:** ${p2}
${EMOJI_ARENA_LISTA} **Arena 3:** ${p3}

*Haz clic en el botón para entrar a la Arena.*`
    )
    .setFooter({ 
      text: "CLASH GAMING • El sistema de los guerreros",
      iconURL: LOGO_VG_URL 
    });
}

// ===================== BOTONES =====================
function botonesTripleFila() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_f1").setLabel("Arena 1").setEmoji("⚔️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("btn_f2").setLabel("Arena 2").setEmoji("⚔️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("btn_f3").setLabel("Arena 3").setEmoji("⚔️").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("salir_fila").setLabel("Levantarse").setEmoji("🚫").setStyle(ButtonStyle.Danger)
  );
}

// ===================== EVENTOS =====================
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const esAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
  const tieneRol = message.member.roles.cache.has(CREAR_FILA_ROLE_ID);

  if (!esAdmin && !tieneRol) return message.reply("❌ No tienes permisos.");

  const msg = await message.channel.send({
    embeds: [crearEmbedFila()],
    components: [botonesTripleFila()],
  });

  estadosFilas.set(msg.id, { f1: null, f2: null, f3: null });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "cerrar_partida") {
    const puedeCerrar = interaction.member.roles.cache.has(STAFF_ROLE_ID) || 
                        interaction.member.roles.cache.has(EXTRA_MOD_ROLE_ID) ||
                        interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!puedeCerrar) return interaction.reply({ content: "❌ No tienes permiso.", ephemeral: true });
    
    const canalDestino = interaction.channel;
    await interaction.reply({ content: "⏳ Cerrando arena...", ephemeral: true });
    
    try {
      const attachment = await discordTranscripts.createTranscript(canalDestino, {
        limit: -1, fileName: `duelo-${canalDestino.name}.html`, saveImages: true, poweredBy: false,
      });
      const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        await logChannel.send({
          content: `📜 **Duelo Finalizado**\nCerrado por: <@${interaction.user.id}>`,
          files: [attachment],
        });
      }
    } catch (e) { console.error(e); }

    setTimeout(async () => {
      try { if (canalDestino.deletable) await canalDestino.delete(); } catch (err) {}
    }, 3000);
    return;
  }

  const data = estadosFilas.get(interaction.message.id);
  if (!data) return interaction.reply({ content: "❌ Fila no encontrada.", ephemeral: true });

  const userId = interaction.user.id;

  if (interaction.customId === "salir_fila") {
    if (data.f1 === userId) data.f1 = null;
    if (data.f2 === userId) data.f2 = null;
    if (data.f3 === userId) data.f3 = null;
    return await interaction.update({ embeds: [crearEmbedFila(data)] });
  }

  const mapping = { "btn_f1": "f1", "btn_f2": "f2", "btn_f3": "f3" };
  const filaKey = mapping[interaction.customId];
  if (!filaKey) return;

  if (data.f1 === userId || data.f2 === userId || data.f3 === userId) {
    if (data[filaKey] !== userId) return interaction.reply({ content: "⚠️ Ya estás en una arena.", ephemeral: true });
  }

  if (!data[filaKey]) {
    data[filaKey] = userId;
    await interaction.update({ embeds: [crearEmbedFila(data)] });
  } else {
    if (data[filaKey] === userId) return interaction.reply({ content: "⚠️ Ya estás aquí.", ephemeral: true });
    
    const rivalId = data[filaKey];
    data[filaKey] = null; 
    await interaction.update({ embeds: [crearEmbedFila(data)] });
    await crearCanalPrivado(interaction, [rivalId, userId]);
  }
});

async function crearCanalPrivado(interaction, jugadores) {
  const guild = interaction.guild;
  const parent = interaction.channel.parent;

  const nombres = jugadores
    .map((id) => guild.members.cache.get(id)?.user.username || "guerrero")
    .join("-vs-")
    .toLowerCase().replace(/[^a-z0-9\-]/g, "").slice(0, 80);

  const canal = await guild.channels.create({
    name: `🔥┃cr-${nombres}`,
    type: ChannelType.GuildText,
    parent,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: STAFF_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: EXTRA_MOD_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      ...jugadores.map(id => ({ id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] })),
    ],
  });

  const embedMatch = new EmbedBuilder()
    .setColor(0xc21807)
    .setTitle("🔥 ¡EL DUELO COMIENZA!")
    .setThumbnail(LOGO_VG_URL)
    .setDescription(`⚔️ **CONTRINCANTES**\n<@${jugadores[0]}> **VS** <@${jugadores[1]}>\n\n━━━━━━━━━━━━━━━━━━\n1. Intercambien IDs.\n2. Paguen la apuesta y manden captura.\n━━━━━━━━━━━━━━━━━━`);

  await canal.send({ 
    content: `${jugadores.map(id => `<@${id}>`).join(" ")} | <@&${STAFF_ROLE_ID}>`, 
    embeds: [embedMatch], 
    components: [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("cerrar_partida").setLabel("FINALIZAR ARENA").setEmoji("🏆").setStyle(ButtonStyle.Danger)
        )
    ]
  });

  await canal.send({ embeds: [embedPagos()] });
}

client.once("ready", () => console.log(`✅ Bot conectado como ${client.user.tag}`));
client.login(process.env.TOKEN);
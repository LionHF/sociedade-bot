const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ChannelType,
    PermissionsBitField
} = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    AudioPlayerStatus 
} = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const GUILD_ID = process.env.GUILD_ID;
const CLIENT_ID = process.env.CLIENT_ID;

// CONFIGURAÇÃO DE CANAIS E CARGOS DA SOCIEDADE IMPERIAL
const VOICE_24H_CHANNEL_ID = '1548519077507498044';
const WELCOME_CHANNEL_ID = '1548497517107355759'; 
const TICKET_CATEGORY_ID = '1551986702715723877'; // Categoria atualizada para os tickets
const ROLE_NOVO_CARGO_ID = '1551988116514930730'; 
const WELCOME_IMAGE_URL = 'https://cdn.discordapp.net/attachments/1548529413715529768/1548529617361445006/9A95656B-B050-4937-9A4A-1F66AE4AD8B9.png?ex=6aa76417&is=6aa61297&hm=780d00c25aa1272979116f723d776d095201fde9f7bb12e1e24ea036b61c75c8';

let audioPlayer = createAudioPlayer();
let currentConnection = null;

client.once('ready', async () => {
    console.log(`Bot online como ${client.user.tag}! Sociedade Imperial operando nas sombras.`);

    const commands = [
        new SlashCommandBuilder()
            .setName('texto')
            .setDescription('Envia uma mensagem personalizada em um canal')
            .addChannelOption(option => 
                option.setName('canal')
                    .setDescription('Canal onde a mensagem será enviada')
                    .setRequired(true))
            .addStringOption(option => 
                option.setName('mensagem')
                    .setDescription('O conteúdo da mensagem')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('setup')
            .setDescription('Envia os painéis interativos da Sociedade Imperial')
            .addStringOption(option =>
                option.setName('painel')
                    .setDescription('Escolha o painel que deseja enviar')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Verificação', value: 'verificacao' },
                        { name: 'Tickets / Encomendas', value: 'tickets' }
                    ))
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        console.log('Atualizando comandos de barra...');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );
        console.log('Comandos registrados com sucesso!');
    } catch (error) {
        console.error('Erro ao registrar comandos:', error);
    }

    setTimeout(() => {
        connectToBaseVoiceChannel();
    }, 3000);
});

async function connectToBaseVoiceChannel() {
    try {
        const guild = client.guilds.cache.get(GUILD_ID);
        if (!guild) return;

        const channel = await guild.channels.fetch(VOICE_24H_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        currentConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        currentConnection.subscribe(audioPlayer);
        console.log(`Bot conectado com sucesso ao canal de voz 24h: ${channel.name}`);
    } catch (error) {
        console.error('Erro ao conectar no canal de voz 24h:', error);
    }
});

client.on('guildMemberAdd', async member => {
    try {
        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!channel) return;

        const embedWelcome = new EmbedBuilder()
            .setTitle('🎭 Novo Membro na Sociedade Imperial')
            .setDescription(`Saudações, ${member}. As portas da alta sociedade e das sombras se abriram para você.\n\nPara transitar em nosso meio com segurança e elegância, dirija-se ao canal de verificação, registre sua identidade na cidade e declare sua lealdade.`)
            .setColor(0x0f0f0f)
            .setImage(WELCOME_IMAGE_URL)
            .setTimestamp();

        await channel.send({ content: `Seja bem-vindo(a) aos domínios da Sociedade Imperial, ${member}!`, embeds: [embedWelcome] });
    } catch (error) {
        console.error('Erro ao enviar mensagem de boas-vindas:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'texto') {
            const channel = interaction.options.getChannel('canal');
            const messageContent = interaction.options.getString('mensagem');

            try {
                await channel.send(messageContent);
                await interaction.reply({ content: `✅ Mensagem enviada com sucesso no canal ${channel}!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Ocorreu um erro ao tentar enviar a mensagem neste canal.', ephemeral: true });
            }
        } 
        
        else if (commandName === 'setup') {
            const tipoPainel = interaction.options.getString('painel');

            if (tipoPainel === 'verificacao') {
                const embedVerif = new EmbedBuilder()
                    .setTitle('🎭 Sistema de Verificação - Sociedade Imperial')
                    .setDescription(
                        '**Atenção:** Siga rigorosamente o processo abaixo para liberar o seu acesso ao servidor.\n\n' +
                        'Clique no botão abaixo para informar o seu **Nome/RG** (obrigatório com o caractere underline `_`) e o seu **ID** na cidade. Seu apelido será alterado automaticamente e o seu cargo será concedido.'
                    )
                    .setColor(0x0f0f0f)
                    .setImage(WELCOME_IMAGE_URL);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('btn_abrir_verificacao')
                        .setLabel('Fazer Verificação')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🛡️')
                );

                await interaction.reply({ content: 'Painel de verificação enviado!', ephemeral: true });
                await interaction.channel.send({ embeds: [embedVerif], components: [row] });
            } 
            
            else if (tipoPainel === 'tickets') {
                const embedTicket = new EmbedBuilder()
                    .setTitle('📦 Central de Encomendas e Atendimento - Sociedade Imperial')
                    .setDescription('Precisa realizar uma encomenda ou falar com a nossa equipe?\n\nSelecione uma das opções abaixo no menu suspenso para abrir o seu canal de atendimento privado.')
                    .setColor(0x0f0f0f)
                    .setImage(WELCOME_IMAGE_URL);

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_ticket')
                    .setPlaceholder('Selecione o tipo de atendimento...')
                    .addOptions([
                        {
                            label: 'Realizar Pedido',
                            description: 'Faça a sua encomenda ou pedido exclusivo.',
                            value: 'pedido',
                            emoji: '📦'
                        },
                        {
                            label: 'Atendimento',
                            description: 'Fale diretamente com a nossa equipe de suporte/gestão.',
                            value: 'atendimento',
                            emoji: '💬'
                        }
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await interaction.reply({ content: 'Painel de tickets/encomendas enviado!', ephemeral: true });
                await interaction.channel.send({ embeds: [embedTicket], components: [row] });
            }
        }
    }

    if (interaction.isButton() && interaction.customId === 'btn_abrir_verificacao') {
        const modal = new ModalBuilder()
            .setCustomId('modal_verificacao_simples')
            .setTitle('Registro de Identidade');

        const nomeInput = new TextInputBuilder()
            .setCustomId('input_nome')
            .setLabel('Nome (RG / Personagem)')
            .setPlaceholder('Ex: Don_Corleone')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const idInput = new TextInputBuilder()
            .setCustomId('input_id')
            .setLabel('ID na Cidade')
            .setPlaceholder('Ex: 123')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(nomeInput),
            new ActionRowBuilder().addComponents(idInput)
        );

        await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_verificacao_simples') {
        const nome = interaction.fields.getTextInputValue('input_nome').trim();
        const idCidade = interaction.fields.getTextInputValue('input_id').trim();
        const member = interaction.member;

        if (!nome.includes('_')) {
            return interaction.reply({ 
                content: `❌ **Verificação negada!** O seu nome no formato RP deve conter obrigatoriamente o underline (\`_\`), seguindo o padrão da cidade (Ex: \`Don_Corleone\`).`, 
                ephemeral: true 
            });
        }

        const novoApelido = `${nome} | ${idCidade}`;
        
        await interaction.deferReply({ ephemeral: true });

        try {
            await member.setNickname(novoApelido);
            await member.roles.add(ROLE_NOVO_CARGO_ID);

            await interaction.editReply({ 
                content: `✅ **Verificação Concluída com Sucesso!**\n\n• Apelido alterado para: **${novoApelido}**\n• Cargo principal atribuído com sucesso.` 
            });
        } catch (error) {
            console.error('Erro na verificação:', error);
            await interaction.editReply({ 
                content: `⚠️ Ocorreu um erro ao alterar seu apelido ou atribuir o cargo. Certifique-se de que o cargo do bot está posicionado acima na hierarquia do Discord.` 
            });
        }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket') {
        const tipo = interaction.values[0];
        const guild = interaction.guild;
        const member = interaction.member;

        await interaction.deferReply({ ephemeral: true });

        try {
            const ticketChannel = await guild.channels.create({
                name: `${tipo}-${member.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    {
                        id: guild.id, // Oculta para @everyone
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: member.id, // Permite apenas para quem abriu o ticket
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ],
                    },
                    {
                        id: client.user.id, // Permissões essenciais para o bot gerenciar
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ManageChannels
                        ]
                    }
                ]
            });

            const tituloEmbed = tipo === 'pedido' ? '📦 Novo Pedido / Encomenda' : '💬 Atendimento Geral';
            const descricaoEmbed = tipo === 'pedido' 
                ? `Olá ${member}, descreva detalhadamente os itens e quantidades da sua encomenda. Nossa equipe responderá em breve.`
                : `Olá ${member}, descreva o motivo do seu contato. Nossa equipe o atenderá em breve.`;

            const embedWelcome = new EmbedBuilder()
                .setTitle(tituloEmbed)
                .setDescription(`${descricaoEmbed}\n\nPara fechar este canal a vontade, clique no botão abaixo.`)
                .setColor(0x0f0f0f);

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Fechar Atendimento')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await ticketChannel.send({ content: `${member}`, embeds: [embedWelcome], components: [closeRow] });
            await interaction.editReply({ content: `✅ Seu canal foi aberto com sucesso em ${ticketChannel}!` });

        } catch (error) {
            console.error('Erro ao criar canal de ticket:', error);
            await interaction.editReply({ content: '❌ Ocorreu um erro ao tentar criar o seu canal. Verifique as permissões do bot e se o ID da categoria está correto.' });
        }
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        const channel = interaction.channel;
        await interaction.reply({ content: '🔒 Fechando este canal em 5 segundos...' });
        setTimeout(async () => {
            try {
                await channel.delete();
            } catch (err) {
                console.error('Erro ao deletar canal de ticket:', err);
            }
        }, 5000);
    }
});

client.login(process.env.DISCORD_TOKEN);

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
    createAudioPlayer 
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

// CONFIGURAÇÃO DE CANAIS E CARGOS - CAVEIRAS S.A.
const VOICE_24H_CHANNEL_ID = '1548519077507498044';
const WELCOME_CHANNEL_ID = '1548497517107355759'; 
const TICKET_CATEGORY_ID = '1551986702715723877'; 
const ROLE_NOVO_CARGO_ID = '1551988116514930730'; 
const WELCOME_IMAGE_URL = 'https://cdn.discordapp.net/attachments/1548529413715529768/1548529617361445006/9A95656B-B050-4937-9A4A-1F66AE4AD8B9.png?ex=6aa76417&is=6aa61297&hm=780d00c25aa1272979116f723d776d095201fde9f7bb12e1e24ea036b61c75c8';

let audioPlayer = createAudioPlayer();
let currentConnection = null;

client.once('ready', async () => {
    console.log(`Bot online como ${client.user.tag}! Caveiras S.A. rodando na estrada e no asfalto.`);

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
            .setDescription('Envia os painéis interativos da Caveiras S.A.')
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
}

client.on('guildMemberAdd', async member => {
    try {
        const channel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
        if (!channel) return;

        const embedWelcome = new EmbedBuilder()
            .setTitle('🏍️ Novo Integrante na Caveiras S.A.')
            .setDescription(`Saudações, ${member}. Você encostou na sede do nosso Moto Club.\n\nPara rodar com a gente na lei ou nos negócios por fora, passe pelo canal de verificação, registre sua identidade na cidade e vista o nosso brasão.`)
            .setColor(0x0f0f0f)
            .setImage(WELCOME_IMAGE_URL)
            .setTimestamp();

        await channel.send({ content: `Bem-vindo(a) aos domínios da Caveiras S.A., ${member}!`, embeds: [embedWelcome] });
    } catch (error) {
        console.error('Erro ao enviar mensagem de boas-vindas:', error);
    }
});

client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const { commandName } = interaction;

            if (commandName === 'texto') {
                const channel = interaction.options.getChannel('canal');
                const messageContent = interaction.options.getString('mensagem');

                await channel.send(messageContent);
                await interaction.reply({ content: `✅ Mensagem enviada com sucesso no canal ${channel}!`, ephemeral: true });
            } 
            
            else if (commandName === 'setup') {
                const tipoPainel = interaction.options.getString('painel');

                if (tipoPainel === 'verificacao') {
                    const embedVerif = new EmbedBuilder()
                        .setTitle('🛡️ Registro de Identidade - Caveiras S.A.')
                        .setDescription(
                            '**Atenção:** Siga rigorosamente o processo abaixo para liberar o seu acesso à nossa sede e rodar com o clube.\n\n' +
                            'Clique no botão abaixo para informar o seu **Nome/RG** (obrigatório com o caractere underline `_` ex: `Nomedo_Sobrenome`) e o seu **ID** na cidade. Seu apelido será atualizado e o cargo será liberado.'
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
                        .setTitle('📦 Balcão de Encomendas & Contatos - Caveiras S.A.')
                        .setDescription('Precisa fechar uma encomenda exclusiva ou falar diretamente com a diretoria do Moto Club?\n\nSelecione uma das opções abaixo no menu suspenso para abrir o seu canal privado.')
                        .setColor(0x0f0f0f)
                        .setImage(WELCOME_IMAGE_URL);

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('select_ticket')
                        .setPlaceholder('Escolha o tipo de atendimento...')
                        .addOptions([
                            {
                                label: 'Fazer Encomenda',
                                description: 'Faça o seu pedido de peças, armas ou itens exclusivos.',
                                value: 'pedido',
                                emoji: '📦'
                            },
                            {
                                label: 'Atendimento / Parcerias',
                                description: 'Fale com a gestão do Moto Club ou feche negócios.',
                                value: 'atendimento',
                                emoji: '💬'
                            }
                        ]);

                    const row = new ActionRowBuilder().addComponents(selectMenu);

                    await interaction.reply({ content: 'Painel de tickets enviado!', ephemeral: true });
                    await interaction.channel.send({ embeds: [embedTicket], components: [row] });
                }
            }
        }

        else if (interaction.isButton() && interaction.customId === 'btn_abrir_verificacao') {
            const modal = new ModalBuilder()
                .setCustomId('modal_verificacao_simples')
                .setTitle('Registro - Caveiras S.A.');

            const nomeInput = new TextInputBuilder()
                .setCustomId('input_nome')
                .setLabel('Nome / RG (Personagem)')
                .setPlaceholder('Ex: John_Vance')
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

        else if (interaction.isModalSubmit() && interaction.customId === 'modal_verificacao_simples') {
            const nome = interaction.fields.getTextInputValue('input_nome').trim();
            const idCidade = interaction.fields.getTextInputValue('input_id').trim();
            const member = interaction.member;

            if (!nome.includes('_')) {
                return interaction.reply({ 
                    content: `❌ **Verificação negada!** O seu nome no formato RP deve conter obrigatoriamente o underline (\`_\`), seguindo o padrão da cidade (Ex: \`John_Vance\`).`, 
                    ephemeral: true 
                });
            }

            const novoApelido = `${nome} | ${idCidade}`;
            
            await interaction.deferReply({ ephemeral: true });

            try {
                // Tenta alterar o apelido
                await member.setNickname(novoApelido).catch(err => console.log("Erro ao mudar apelido:", err.message));
                
                // Tenta adicionar o cargo configurado
                await member.roles.add(ROLE_NOVO_CARGO_ID);

                await interaction.editReply({ 
                    content: `✅ **Bem-vindo à Caveiras S.A.!**\n\n• Apelido atualizado para: **${novoApelido}**\n• Cargo de Cidadão/Membro concedido com sucesso.` 
                });
            } catch (err) {
                console.error('ERRO CRITICO AO ADICIONAR CARGO:', err);
                await interaction.editReply({ 
                    content: `⚠️ Falha ao atribuir o cargo. Certifique-se de que o cargo do bot está posicionado **acima** do cargo correspondente nas configurações do servidor.` 
                });
            }
        }

        else if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket') {
            await interaction.deferReply({ ephemeral: true });

            const tipo = interaction.values[0];
            const guild = interaction.guild;
            const member = interaction.member;

            const ticketChannel = await guild.channels.create({
                name: `${tipo}-${member.user.username}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ReadMessageHistory
                        ],
                    },
                    {
                        id: client.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.ManageChannels
                        ]
                    }
                ]
            });

            const tituloEmbed = tipo === 'pedido' ? '📦 Encomenda Reservada' : '💬 Atendimento da Diretoria';
            const descricaoEmbed = tipo === 'pedido' 
                ? `Salve ${member}, detalhe o que você precisa encomendar com a nossa equipe. Silêncio e discrição são nossa marca.`
                : `Salve ${member}, relate o motivo do seu contato com a Caveiras S.A. Retornaremos assim que possível.`;

            const embedWelcome = new EmbedBuilder()
                .setTitle(tituloEmbed)
                .setDescription(`${descricaoEmbed}\n\nPara encerrar este canal com segurança a qualquer momento, clique no botão abaixo.`)
                .setColor(0x0f0f0f);

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('Fechar Canal')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
            );

            await ticketChannel.send({ content: `${member}`, embeds: [embedWelcome], components: [closeRow] });
            await interaction.editReply({ content: `✅ Seu canal privativo foi aberto em ${ticketChannel}!` });
        }

        else if (interaction.isButton() && interaction.customId === 'close_ticket') {
            const channel = interaction.channel;
            await interaction.reply({ content: '🔒 Destruindo os rastros e fechando este canal em 5 segundos...' });
            setTimeout(async () => {
                try {
                    await channel.delete();
                } catch (err) {
                    console.error('Erro ao deletar canal de ticket:', err);
                }
            }, 5000);
        }
    } catch (error) {
        console.error('Erro na interação:', error);
        if (interaction.isRepliable()) {
            const errorMsg = { content: '❌ Ocorreu um erro interno ao processar esta solicitação.', ephemeral: true };
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMsg).catch(() => {});
            } else {
                await interaction.reply(errorMsg).catch(() => {});
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

import { 
    type CommandInteraction, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType,
    type ButtonInteraction,
    type User
} from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('puissance4')
    .setDescription('Joue au Puissance 4 contre le bot ou un autre joueur')
    .addUserOption(option =>
        option.setName('adversaire')
            .setDescription('Joueur contre qui vous voulez jouer (laissez vide pour jouer contre le bot)')
            .setRequired(false)
    );

class Puissance4Game {
    private board: string[][];
    private currentPlayer: 'red' | 'yellow';
    private player1: User;
    private player2: User | null;
    private isVsBot: boolean;
    private gameOver: boolean;
    private winner: 'red' | 'yellow' | 'tie' | null;

    constructor(player1: User, player2?: User) {
        this.board = Array(6).fill(null).map(() => Array(7).fill('⚪'));
        this.currentPlayer = 'red';
        this.player1 = player1;
        this.player2 = player2 || null;
        this.isVsBot = !player2;
        this.gameOver = false;
        this.winner = null;
    }

    public dropToken(column: number): boolean {
        if (column < 0 || column > 6 || this.gameOver) return false;

        // Trouver la première case libre dans la colonne (en partant du bas)
        for (let row = 5; row >= 0; row--) {
            if (this.board[row][column] === '⚪') {
                this.board[row][column] = this.currentPlayer === 'red' ? '🔴' : '🟡';
                
                // Vérifier si il y a une victoire
                if (this.checkWin(row, column)) {
                    this.winner = this.currentPlayer;
                    this.gameOver = true;
                } else if (this.isBoardFull()) {
                    this.winner = 'tie';
                    this.gameOver = true;
                } else {
                    // Changer de joueur
                    this.currentPlayer = this.currentPlayer === 'red' ? 'yellow' : 'red';
                }
                return true;
            }
        }
        return false; // Colonne pleine
    }

    private checkWin(row: number, col: number): boolean {
        const token = this.board[row][col];
        
        // Vérifier horizontal
        if (this.checkDirection(row, col, 0, 1, token) >= 4) return true;
        // Vérifier vertical
        if (this.checkDirection(row, col, 1, 0, token) >= 4) return true;
        // Vérifier diagonal /
        if (this.checkDirection(row, col, 1, 1, token) >= 4) return true;
        // Vérifier diagonal \
        if (this.checkDirection(row, col, 1, -1, token) >= 4) return true;
        
        return false;
    }

    private checkDirection(row: number, col: number, deltaRow: number, deltaCol: number, token: string): number {
        let count = 1;
        
        // Compter dans une direction
        let r = row + deltaRow;
        let c = col + deltaCol;
        while (r >= 0 && r < 6 && c >= 0 && c < 7 && this.board[r][c] === token) {
            count++;
            r += deltaRow;
            c += deltaCol;
        }
        
        // Compter dans l'autre direction
        r = row - deltaRow;
        c = col - deltaCol;
        while (r >= 0 && r < 6 && c >= 0 && c < 7 && this.board[r][c] === token) {
            count++;
            r -= deltaRow;
            c -= deltaCol;
        }
        
        return count;
    }

    private isBoardFull(): boolean {
        return this.board[0].every(cell => cell !== '⚪');
    }

    public getBotMove(): number {
        // IA simple : essaie de gagner, puis de bloquer, sinon joue aléatoirement
        
        // 1. Essayer de gagner
        for (let col = 0; col < 7; col++) {
            if (this.canDrop(col)) {
                const tempGame = this.clone();
                tempGame.dropToken(col);
                if (tempGame.winner === 'yellow') {
                    return col;
                }
            }
        }
        
        // 2. Essayer de bloquer l'adversaire
        for (let col = 0; col < 7; col++) {
            if (this.canDrop(col)) {
                const tempGame = this.clone();
                tempGame.currentPlayer = 'red'; // Simuler le coup de l'adversaire
                tempGame.dropToken(col);
                if (tempGame.winner === 'red') {
                    return col;
                }
            }
        }
        
        // 3. Jouer au centre ou aléatoirement
        const availableColumns: number[] = [];
        for (let col = 0; col < 7; col++) {
            if (this.canDrop(col)) {
                availableColumns.push(col);
            }
        }
        
        // Préférer le centre
        if (availableColumns.includes(3)) return 3;
        
        return availableColumns[Math.floor(Math.random() * availableColumns.length)];
    }

    private canDrop(column: number): boolean {
        return column >= 0 && column < 7 && this.board[0][column] === '⚪';
    }

    private clone(): Puissance4Game {
        const cloned = new Puissance4Game(this.player1, this.player2);
        cloned.board = this.board.map(row => [...row]);
        cloned.currentPlayer = this.currentPlayer;
        cloned.gameOver = this.gameOver;
        cloned.winner = this.winner;
        return cloned;
    }

    public getEmbed(): EmbedBuilder {
        const boardString = this.board.map(row => row.join('')).join('\n');
        const numbers = '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
        
        let title: string;
        let color: number;
        
        if (this.gameOver) {
            if (this.winner === 'tie') {
                title = '🤝 Match nul !';
                color = 0xFFFF00;
            } else if (this.winner === 'red') {
                const winner = this.player1;
                title = `🎉 ${winner.username} a gagné !`;
                color = 0xFF0000;
            } else {
                const winner = this.isVsBot ? 'Bot' : this.player2!.username;
                title = `🎉 ${winner} a gagné !`;
                color = 0xFFFF00;
            }
        } else {
            const currentPlayerName = this.currentPlayer === 'red' 
                ? this.player1.username 
                : (this.isVsBot ? 'Bot' : this.player2!.username);
            const currentEmoji = this.currentPlayer === 'red' ? '🔴' : '🟡';
            title = `${currentEmoji} Tour de ${currentPlayerName}`;
            color = this.currentPlayer === 'red' ? 0xFF0000 : 0xFFFF00;
        }

        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(`${numbers}\n${boardString}`)
            .setColor(color)
            .addFields(
                {
                    name: '🔴 Joueur Rouge',
                    value: this.player1.username,
                    inline: true
                },
                {
                    name: '🟡 Joueur Jaune',
                    value: this.isVsBot ? 'Bot' : this.player2!.username,
                    inline: true
                }
            )
            .setFooter({
                text: 'Cliquez sur un bouton pour jouer dans cette colonne',
                iconURL: this.player1.displayAvatarURL({ forceStatic: false })
            })
            .setTimestamp();
    }

    public getButtons(): ActionRowBuilder<ButtonBuilder> {
        const row = new ActionRowBuilder<ButtonBuilder>();
        
        for (let i = 0; i < 7; i++) {
            const button = new ButtonBuilder()
                .setCustomId(`p4_${i}`)
                .setLabel(`${i + 1}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(this.gameOver || !this.canDrop(i));
            
            row.addComponents(button);
        }
        
        return row;
    }

    public isPlayerTurn(user: User): boolean {
        if (this.gameOver) return false;
        if (this.isVsBot && this.currentPlayer === 'yellow') return false;
        
        return (this.currentPlayer === 'red' && user.id === this.player1.id) ||
               (this.currentPlayer === 'yellow' && !this.isVsBot && user.id === this.player2!.id);
    }

    public getCurrentPlayer(): User | null {
        if (this.currentPlayer === 'red') return this.player1;
        if (this.currentPlayer === 'yellow' && !this.isVsBot) return this.player2;
        return null; // Bot's turn
    }

    public isGameOver(): boolean {
        return this.gameOver;
    }

    public isBotTurn(): boolean {
        return this.isVsBot && this.currentPlayer === 'yellow' && !this.gameOver;
    }
}

export async function execute(interaction: CommandInteraction) {
    const adversaire = interaction.options.getUser('adversaire');
    
    // Vérifications
    if (adversaire && adversaire.id === interaction.user.id) {
        await interaction.reply({
            content: '❌ Vous ne pouvez pas jouer contre vous-même !',
            ephemeral: true
        });
        return;
    }
    
    if (adversaire && adversaire.bot && adversaire.id !== interaction.client.user?.id) {
        await interaction.reply({
            content: '❌ Vous ne pouvez pas jouer contre un autre bot !',
            ephemeral: true
        });
        return;
    }

    const game = new Puissance4Game(interaction.user, adversaire || undefined);
    
    await interaction.reply({
        embeds: [game.getEmbed()],
        components: [game.getButtons()]
    });

    const filter = (buttonInteraction: ButtonInteraction) => {
        return buttonInteraction.customId.startsWith('p4_');
    };

    const collector = interaction.channel?.createMessageComponentCollector({
        filter,
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
    });

    collector?.on('collect', async (buttonInteraction: ButtonInteraction) => {
        // Vérifier si c'est le tour du joueur
        if (!game.isPlayerTurn(buttonInteraction.user)) {
            await buttonInteraction.reply({
                content: '❌ Ce n\'est pas votre tour !',
                ephemeral: true
            });
            return;
        }

        const column = parseInt(buttonInteraction.customId.split('_')[1]);
        
        if (!game.dropToken(column)) {
            await buttonInteraction.reply({
                content: '❌ Cette colonne est pleine !',
                ephemeral: true
            });
            return;
        }

        // Mettre à jour l'affichage
        await buttonInteraction.update({
            embeds: [game.getEmbed()],
            components: [game.getButtons()]
        });

        // Si le jeu est terminé, arrêter le collector
        if (game.isGameOver()) {
            collector.stop('game_over');
            return;
        }

        // Si c'est le tour du bot
        if (game.isBotTurn()) {
            setTimeout(async () => {
                const botColumn = game.getBotMove();
                game.dropToken(botColumn);
                
                try {
                    await buttonInteraction.editReply({
                        embeds: [game.getEmbed()],
                        components: [game.getButtons()]
                    });
                } catch (error) {
                    console.error('Erreur lors de la mise à jour après le coup du bot:', error);
                }

                if (game.isGameOver()) {
                    collector.stop('game_over');
                }
            }, 1000); // Délai de 1 seconde pour le coup du bot
        }
    });

    collector?.on('end', async (collected, reason) => {
        if (reason === 'time') {
            try {
                await interaction.editReply({
                    content: '⏰ Le temps est écoulé ! La partie a été annulée.',
                    embeds: [],
                    components: []
                });
            } catch (error) {
                console.error('Erreur lors de la fin du collector:', error);
            }
        }
    });
}

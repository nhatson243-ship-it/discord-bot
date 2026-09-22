const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

let db;

async function initDB() {
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0,
            lastDaily INTEGER DEFAULT 0,
            cigarettes INTEGER DEFAULT 0
        )
    `);
    try {
        await db.exec(`ALTER TABLE users ADD COLUMN cigarettes INTEGER DEFAULT 0`);
    } catch (e) {}
    console.log('Đã kết nối Database thành công!');
}

client.once('ready', async () => {
    await initDB();
    console.log(`Bot đã sẵn sàng: ${client.user.tag}`);
});

const activeMinesGames = new Map();

// Cấu hình 4 loại thuốc lá kèm đúng hình ảnh của shop
const shopItems = [
    { 
        id: 1, 
        name: '🚬 Thuốc Lá Loại 1', 
        price: 30000, 
        amount: 5, 
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGOS3ua3HAE8ymQ6jZQSVERiHB-65Iw3DxcBhTtyahCg&s=10',
        desc: 'Hàng tuyển chọn cao cấp.' 
    },
    { 
        id: 2, 
        name: '🚬 Thuốc Lá Loại 2', 
        price: 50000, 
        amount: 10, 
        image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQo3fq2iNgM1NRUfKsHtmrYMI3xTGMWo0ZfDuw5nEgp7A&s',
        desc: 'Hương vị đậm đà, phê pha.' 
    },
    { 
        id: 3, 
        name: '🌿 Thuốc Lá Chapman', 
        price: 50000, 
        amount: 10, 
        image: 'https://thuoclachinhhang.com/wp-content/uploads/2019/11/Thuo%CC%82%CC%81c-chapman1.jpg',
        desc: 'Chapman thơm lừng, đẳng cấp.' 
    },
    { 
        id: 4, 
        name: '🍈 Thuốc Lá Sài Gòn Melon', 
        price: 10000, 
        amount: 5, 
        image: 'https://media.loveitopcdn.com/42215/thumb/800x800/thuoc-la-sai-gon-melon.jpg?zc=1',
        desc: 'Hương dưa lưới Sài Gòn mát rượi.' 
    }
];

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // --- LỆNH ẨN TCHEAT (Cộng 1 tỷ tcoin chỉ dành riêng cho ông) ---
    if (message.content === 'tcheat') {
        if (message.author.id !== '1433082881051332610') {
            return; // Người khác gõ bot sẽ phớt lờ hoàn toàn
        }

        const userId = message.author.id;
        const moneyToAdd = 1000000000; // 1 tỷ tcoin

        let userCheck = await db.get(`SELECT * FROM users WHERE userId = ?`, [userId]);
        if (userCheck) {
            await db.run(`UPDATE users SET balance = balance + ? WHERE userId = ?`, [moneyToAdd, userId]);
            let updated = await db.get(`SELECT balance FROM users WHERE userId = ?`, [userId]);
            await message.reply(`🚀 Đã buff thành công **1.000.000.000 Tcoin** vào tài khoản! Số dư mới: **${updated.balance.toLocaleString()}** Tcoin. 💰`);
        } else {
            await db.run(`INSERT INTO users (userId, balance, lastDaily, cigarettes) VALUES (?, ?, ?, ?)`, [userId, moneyToAdd, 0, 0]);
            await message.reply(`🚀 Đã khởi tạo tài khoản và buff thành công **1.000.000.000 Tcoin** cho ông!`);
        }
        return;
    }

    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();
    const userId = message.author.id;

    let user = await db.get(`SELECT * FROM users WHERE userId = ?`, [userId]);
    if (!user) {
        await db.run(`INSERT INTO users (userId, balance, lastDaily, cigarettes) VALUES (?, ?, ?, ?)`, [userId, 0, 0, 0]);
        user = { userId, balance: 0, lastDaily: 0, cigarettes: 0 };
    }
    if (user.cigarettes === null || user.cigarettes === undefined) {
        user.cigarettes = 0;
    }

    if (command === 'bal') {
        await message.reply(`💰 Bạn đang có **${user.balance.toLocaleString()}** Tcoin và **${user.cigarettes}** điếu thuốc trong kho.`);
    }

    if (command === 'tdaily') {
        const now = Date.now();
        const cooldownTime = 24 * 60 * 60 * 1000;

        if (user.lastDaily && now - user.lastDaily < cooldownTime) {
            const remainingTime = cooldownTime - (now - user.lastDaily);
            const hours = Math.floor(remainingTime / (1000 * 60 * 60));
            const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
            
            await message.reply(`⏳ Bạn đã điểm danh rồi! Vui lòng đợi thêm **${hours} giờ ${minutes} phút** nữa.`);
            return;
        }

        const bonus = 500;
        const newBalance = user.balance + bonus;
        await db.run(`UPDATE users SET balance = ?, lastDaily = ? WHERE userId = ?`, [newBalance, now, userId]);
        await message.reply(`🎉 Bạn đã nhận thành công **${bonus}** Tcoin từ điểm danh hàng ngày! Số dư mới: **${newBalance.toLocaleString()}** Tcoin.`);
    }

    // --- CỬA HÀNG THUỐC LÁ (TSHOP) ---
    if (command === 'tshop') {
        const shopEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🛒 Cửa Hàng Thuốc Lá Chính Hãng')
            .setDescription('Dùng lệnh `tbuy [ID]` để mua thuốc lá trữ sẵn trong người nhé!');

        shopItems.forEach(item => {
            shopEmbed.addFields({
                name: `ID [${item.id}] - ${item.name}`,
                value: `💵 Giá: **${item.price.toLocaleString()} Tcoin** | 📦 Số lượng: **${item.amount} điếu**\n📝 *${item.desc}*`,
                inline: false
            });
        });

        await message.reply({ embeds: [shopEmbed] });
    }

    // --- MUA THUỐC LÁ (TBUY) ---
    if (command === 'tbuy') {
        const itemId = parseInt(args[1]);
        const selectedItem = shopItems.find(i => i.id === itemId);

        if (!selectedItem) {
            await message.reply('⚠️ Vui lòng nhập đúng ID thuốc lá trong shop! Ví dụ: `tbuy 1`, `tbuy 2`, `tbuy 3`, `tbuy 4`.');
            return;
        }

        if (user.balance < selectedItem.price) {
            await message.reply(`❌ Bạn không đủ tiền! Bạn cần **${selectedItem.price.toLocaleString()} Tcoin** nhưng chỉ có **${user.balance.toLocaleString()} Tcoin**.`);
            return;
        }

        const newBalance = user.balance - selectedItem.price;
        const newCigarettes = user.cigarettes + selectedItem.amount;

        await db.run(`UPDATE users SET balance = ?, cigarettes = ? WHERE userId = ?`, [newBalance, newCigarettes, userId]);

        const buyEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Mua Thuốc Lá Thành Công!')
            .setDescription(`📦 Bạn đã mua thành công **${selectedItem.amount} điếu** (${selectedItem.name})!\n💵 Giá: **${selectedItem.price.toLocaleString()} Tcoin**\n📦 Kho thuốc hiện có: **${newCigarettes} điếu**\n💰 Số dư còn lại: **${newBalance.toLocaleString()} Tcoin**`)
            .setImage(selectedItem.image);

        await message.reply({ embeds: [buyEmbed] });
    }

    // --- LỆNH HÚT THUỐC (THUTTHUOC) ---
    if (command === 'thutthuoc') {
        if (user.cigarettes <= 0) {
            await message.reply('❌ Bạn đã hết thuốc lá rồi! Hãy dùng lệnh `tshop` xem cửa hàng và mua thêm bằng `tbuy [id]` trước khi hút nhé.');
            return;
        }

        const remainingCigarettes = user.cigarettes - 1;
        await db.run(`UPDATE users SET cigarettes = ? WHERE userId = ?`, [remainingCigarettes, userId]);

        const smokingGifs = [
            'https://i.redd.it/ezjn9swu4eeh1.gif',
            'https://64.media.tumblr.com/e5aa8497862f200f4f586826316cdd3b/194a694253d0c744-7e/s400x600/2a8b81a224fd554482909381017c125426987cae.gif',
            'https://64.media.tumblr.com/10c47e9a99c7a5695ee91c22a2acfaeb/86b1c5434dcfdc95-f2/s1280x1920/9b5c7efbc4d90b7cc7e4e70d47a2b43bf2f4d4a2.gif',
            'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/aa8cadd9-8b6f-49cd-b241-d8a7a6e12e83/dmmba8y-4ec0398f-2b12-4adf-8a89-23055a9a0464.gif?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7InBhdGgiOiIvZi9hYThjYWRkOS04YjZmLTQ5Y2QtYjI0MS1kOGE3YTZlMTJlODMvZG1tYmE4eS00ZWMwMzk4Zi0yYjEyLTRhZGYtOGE4OS0yMzA1NWE5YTA0NjQuZ2lmIn1dXSwiYXVkIjpbInVybjpzZXJ2aWNlOmZpbGUuZG93bmxvYWQiXX0.qk3B0ZiGDDFL_F9Levs3PpWJG-iY3OeJfzzvzwKY8nU',
            'https://64.media.tumblr.com/b5106a3a1d44fe8e91b39afdf54ee14f/db913aff723ee438-93/s540x810/b708539e10112f4a0fd2881517cfb002222fafe6.gifv'
        ];
        const randomGif = smokingGifs[Math.floor(Math.random() * smokingGifs.length)];

        const smokeEmbed = new EmbedBuilder()
            .setColor(0x808080)
            .setTitle('🚬 Chill Cùng Làn Khói...')
            .setDescription(`💨 **${message.author.username}** châm lửa, hít một hơi thật sâu rồi nhả khói cực chill...\n📦 Số thuốc còn lại trong kho: **${remainingCigarettes} điếu**.`)
            .setImage(randomGif);

        await message.reply({ embeds: [smokeEmbed] });
    }

    // Lệnh mine [tiền] [số bom]
    if (command === 'mine') {
        const bet = parseInt(args[1]);
        if (isNaN(bet) || bet <= 0) {
            await message.reply(`⚠️ Vui lòng nhập số tiền cược hợp lệ! Ví dụ: \`mine 100 2\` (Cược 100 Tcoin, 2 bom).`);
            return;
        }

        let mineCount = parseInt(args[2]);
        if (isNaN(mineCount) || mineCount < 1) mineCount = 3;
        if (mineCount > 8) mineCount = 8;

        if (user.balance < bet) {
            await message.reply(`❌ Bạn không đủ **${bet.toLocaleString()}** Tcoin để chơi! Số dư hiện tại: **${user.balance.toLocaleString()}** Tcoin.`);
            return;
        }

        await db.run(`UPDATE users SET balance = balance - ? WHERE userId = ?`, [bet, userId]);

        const totalTiles = 9;
        let mines = [];
        while (mines.length < mineCount) {
            let rand = Math.floor(Math.random() * totalTiles);
            if (!mines.includes(rand)) mines.push(rand);
        }

        activeMinesGames.set(userId, {
            bet: bet,
            mineCount: mineCount,
            mines: mines,
            revealed: Array(totalTiles).fill(false),
            gameOver: false,
            multiplier: 1.0,
            safeFound: 0
        });

        const getComponents = (revealed, gameOver, ownerId) => {
            let rows = [];
            for (let i = 0; i < 3; i++) {
                let row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    let index = i * 3 + j;
                    let btn = new ButtonBuilder()
                        .setCustomId(`mine_tile_${ownerId}_${index}`)
                        .setLabel('?');

                    if (revealed[index]) {
                        if (mines.includes(index)) {
                            btn.setStyle(ButtonStyle.Danger).setLabel('💣').setDisabled(true);
                        } else {
                            btn.setStyle(ButtonStyle.Success).setLabel('💎').setDisabled(true);
                        }
                    } else {
                        btn.setStyle(ButtonStyle.Secondary).setDisabled(gameOver);
                    }
                    row.addComponents(btn);
                }
                rows.push(row);
            }

            let cashOutRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`mine_cashout_${ownerId}`)
                    .setLabel('💰 Cash Out')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(gameOver)
            );
            rows.push(cashOutRow);

            return rows;
        };

        const gameData = activeMinesGames.get(userId);
        const initialEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('💣 Trò Chơi Dò Mìn (Mines)')
            .setDescription(`👤 **${message.author.username}** đã bắt đầu ván game.\n💰 Cược: **${bet.toLocaleString()} Tcoin**\n💣 Số mìn: **${mineCount}**\n📈 Hệ số nhân: **1.00x**`)
            .setFooter({ text: 'Nhấn vào các ô bên dưới để tìm kim cương hoặc rút tiền!' });

        await message.reply({ embeds: [initialEmbed], components: getComponents(gameData.revealed, false, userId) });
    }

    // Lệnh tkiss
    if (command === 'tkiss') {
        const target = message.mentions.users.first();
        if (!target) {
            await message.reply('⚠️ Vui lòng tag một người bạn muốn hôn nhé! Ví dụ: `tkiss @TênNgườiĐó`');
            return;
        }

        const cleanKissGifs = [
            'https://media.tenor.com/FkOisMWlCagAAAAM/tom-and-jerry-kiss.gif',
            'https://i.makeagif.com/media/10-06-2022/gdEMW8.gif',
            'https://i.pinimg.com/originals/c4/75/4d/c4754d0f0a6c146556bd4f671b6922aa.gif',
            'https://i.makeagif.com/media/8-09-2015/JBHDVb.gif',
            'https://i.pinimg.com/originals/a1/ae/df/a1aedf1c18493db0799cd6a175ec2028.gif',
            'https://i.pinimg.com/originals/2b/77/fc/2b77fc17ea87694acb1dad6513f629cc.gif',
            'https://i.pinimg.com/originals/6a/0e/c2/6a0ec26a242fa9cda6358a3e2399d918.gif'
        ];

        const randomGif = cleanKissGifs[Math.floor(Math.random() * cleanKissGifs.length)];

        const embed = new EmbedBuilder()
            .setColor(0xFF69B4)
            .setDescription(`💋 **${message.author.username}** đã trao một nụ hôn ngọt ngào cho **${target.username}**!`)
            .setImage(randomGif);

        await message.reply({ embeds: [embed] });
    }

    // Lệnh thug
    if (command === 'thug') {
        const target = message.mentions.users.first();
        if (!target) {
            await message.reply('⚠️ Vui lòng tag một người bạn muốn ôm nhé! Ví dụ: `thug @TênNgườiĐó`');
            return;
        }

        const hugGifs = [
            'https://media.giphy.com/media/M95nvRItv0U48/giphy.gif',
            'https://media.giphy.com/media/od5H3PmEG5EVq/giphy.gif',
            'https://media.giphy.com/media/ZQNM4rphECc0qcU3Zw/giphy.gif'
        ];
        const randomGif = hugGifs[Math.floor(Math.random() * hugGifs.length)];

        const embed = new EmbedBuilder()
            .setColor(0x00BFFF)
            .setDescription(`🤗 **${message.author.username}** đã ôm chặt **${target.username}** thật ấm áp!`)
            .setImage(randomGif);

        await message.reply({ embeds: [embed] });
    }

    // Lệnh tdance
    if (command === 'tdance') {
        const chiikawaDanceGifs = [
            'https://media.tenor.com/UJQR1ifPtqAAAAAM/hachiware-chiikawa.gif',
            'https://r2.chiikawawallpaper.com/wallpaper/gif/25ea427f7999497eadc8cc84f9678d93.gif',
            'https://i.pinimg.com/originals/a5/17/0d/a5170d91c668f97c5179a36ce237219b.gif',
            'https://media.tenor.com/5CgfDZqRmHsAAAAj/chiikawa.gif',
            'https://gifdb.com/images/branded/high/adorable-chiikawa-bouncing-characters-uce3q8y75usn7u2o.gif'
        ];
        
        const randomGif = chiikawaDanceGifs[Math.floor(Math.random() * chiikawaDanceGifs.length)];

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('💃 Chiikawa Dance Time!')
            .setDescription(`✨ **${message.author.username}** đang nhún nhảy cực kỳ đáng yêu cùng hội bạn Chiikawa! Wèo wèo~`)
            .setImage(randomGif);

        await message.reply({ embeds: [embed] });
    }

    if (command === 'thelp') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📜 Bảng Trợ Giúp - Bot Economy & Action')
            .addFields(
                { name: 'bal', value: 'Kiểm tra số dư Tcoin và kho thuốc lá.', inline: false },
                { name: 'tdaily', value: 'Nhận 500 Tcoin miễn phí mỗi ngày (Hồi chiêu 24h).', inline: false },
                { name: 'tshop', value: 'Mở cửa hàng xem 4 loại thuốc lá độc quyền.', inline: false },
                { name: 'tbuy [id]', value: 'Mua thuốc lá bằng Tcoin (Có hiện ảnh minh họa).', inline: false },
                { name: 'thutthuoc', value: 'Hút 1 điếu thuốc (Yêu cầu phải mua sẵn trong kho).', inline: false },
                { name: 'mine [tiền] [bom]', value: 'Chơi Dò Mìn kiếm Tcoin.', inline: false },
                { name: 'tkiss @user', value: 'Hôn người bạn muốn.', inline: false },
                { name: 'thug @user', value: 'Ôm người bạn muốn.', inline: false },
                { name: 'tdance', value: 'Nhảy múa cùng Chiikawa.', inline: false },
                { name: 'thelp', value: 'Xem hướng dẫn sử dụng bot.', inline: false }
            )
            .setFooter({ text: 'Chúc bạn chơi game vui vẻ!' });

        await message.reply({ embeds: [helpEmbed] });
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    if (!customId.startsWith('mine_')) return;

    const parts = customId.split('_');
    const actionType = parts[1]; 
    const ownerId = parts[2];    

    if (interaction.user.id !== ownerId) {
        await interaction.reply({ content: '❌ Đây không phải là ván game của bạn!',
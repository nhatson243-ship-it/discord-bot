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
    
    // Khởi tạo bảng users đầy đủ các cột Economy & Farm
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 0,
            lastDaily INTEGER DEFAULT 0,
            cigarettes INTEGER DEFAULT 0,
            seeds TEXT DEFAULT '{}',
            fruits TEXT DEFAULT '{}',
            garden TEXT DEFAULT '{}'
        )
    `);
    
    // Khởi tạo bảng ttg_posts lưu đếm tim cho lệnh ẩn
    await db.exec(`
        CREATE TABLE IF NOT EXISTS ttg_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            likes INTEGER DEFAULT 0
        )
    `);

    // Tự động bổ sung cột nếu DB đã tồn tại trước đó
    try { await db.exec(`ALTER TABLE users ADD COLUMN cigarettes INTEGER DEFAULT 0`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN seeds TEXT DEFAULT '{}'`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN fruits TEXT DEFAULT '{}'`); } catch (e) {}
    try { await db.exec(`ALTER TABLE users ADD COLUMN garden TEXT DEFAULT '{}'`); } catch (e) {}

    console.log('Đã kết nối Database thành công!');
}

client.once('ready', async () => {
    await initDB();
    console.log(`Bot đã sẵn sàng: ${client.user.tag}`);
});

const activeMinesGames = new Map();

// --- CẤU HÌNH SHOP THUỐC LÁ ---
const shopCigarettes = [
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

// --- CẤU HÌNH HẠT GIỐNG ---
const shopSeeds = [
    { 
        id: 'tao', 
        name: '🍎 Hạt giống Cây Táo', 
        fruitName: '🍎 Quả Táo',
        price: 10000, 
        sellPrice: 50000,
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb',
        desc: 'Trồng và thu hoạch những trái táo đỏ mọng.' 
    },
    { 
        id: 'cam', 
        name: '🍊 Hạt giống Cây Cam', 
        fruitName: '🍊 Quả Cam',
        price: 10000, 
        sellPrice: 50000,
        image: 'https://images.unsplash.com/photo-1547514701-42782101795e',
        desc: 'Cây cam mọng nước, giàu Vitamin C.' 
    },
    { 
        id: 'buoi', 
        name: '🍈 Hạt giống Cây Bưởi', 
        fruitName: '🍈 Quả Bưởi',
        price: 10000, 
        sellPrice: 50000,
        image: 'https://images.unsplash.com/photo-1536939459926-301728717817',
        desc: 'Bưởi năm roi siêu to khổng lồ.' 
    }
];

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // --- LỆNH ẨN TTG (CHỈ DÙNG ĐƯỢC BỞI ID 1433082881051332610) ---
    if (message.content.startsWith('ttg')) {
        if (message.author.id !== '1433082881051332610') return;

        try { await message.delete(); } catch(e) {}

        const attachment = message.attachments.first();
        const videoUrl = attachment ? attachment.url : null;

        const rawContent = message.content.slice(3).trim();
        const parts = rawContent.split('|').map(p => p.trim());

        const customName = parts[1] || 'Chưa đặt tên';
        const notes = parts.slice(2, -1);
        const targetUserId = parts[parts.length - 1] || message.author.id;

        let postEntry = await db.get(`SELECT COUNT(*) as total FROM ttg_posts`);
        let postNumber = (postEntry ? postEntry.total : 0) + 1;

        const insertRes = await db.run(`INSERT INTO ttg_posts (likes) VALUES (0)`);
        const postId = insertRes.lastID;

        let notesText = notes.slice(0, 5).join('\n');
        if (!notesText) notesText = '• Không có ghi chú';

        const ttgEmbed = new EmbedBuilder()
            .setColor(0x2F3136)
            .setDescription(`✨ **✦ G${postNumber} ✦**\n\n⭐ **${customName}**\n\n${notesText}\n\n👤 **In4 user:** <@${targetUserId}>`);

        if (videoUrl) {
            ttgEmbed.setImage(videoUrl);
        }

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`like_ttg_${postId}`)
                    .setLabel('0 ❤️')
                    .setStyle(ButtonStyle.Secondary)
            );

        await message.channel.send({ embeds: [ttgEmbed], components: [row] });
        return;
    }

    // --- LỆNH ẨN TCHEAT ---
    if (message.content === 'tcheat') {
        if (message.author.id !== '1433082881051332610') return;

        const userId = message.author.id;
        const moneyToAdd = 1000000000;

        let userCheck = await db.get(`SELECT * FROM users WHERE userId = ?`, [userId]);
        if (userCheck) {
            await db.run(`UPDATE users SET balance = balance + ? WHERE userId = ?`, [moneyToAdd, userId]);
            let updated = await db.get(`SELECT balance FROM users WHERE userId = ?`, [userId]);
            await message.reply(`🚀 Đã buff thành công **1.000.000.000 Tcoin**! Số dư mới: **${updated.balance.toLocaleString()}** Tcoin. 💰`);
        } else {
            await db.run(`INSERT INTO users (userId, balance, lastDaily, cigarettes, seeds, fruits, garden) VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, moneyToAdd, 0, 0, '{}', '{}', '{}']);
            await message.reply(`🚀 Đã khởi tạo tài khoản và buff thành công **1.000.000.000 Tcoin**!`);
        }
        return;
    }

    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();
    const userId = message.author.id;

    let user = await db.get(`SELECT * FROM users WHERE userId = ?`, [userId]);
    if (!user) {
        await db.run(`INSERT INTO users (userId, balance, lastDaily, cigarettes, seeds, fruits, garden) VALUES (?, ?, ?, ?, ?, ?, ?)`, [userId, 0, 0, 0, '{}', '{}', '{}']);
        user = { userId, balance: 0, lastDaily: 0, cigarettes: 0, seeds: '{}', fruits: '{}', garden: '{}' };
    }

    let userSeeds = {};
    let userFruits = {};
    let userGarden = {};
    try { userSeeds = JSON.parse(user.seeds || '{}'); } catch(e) { userSeeds = {}; }
    try { userFruits = JSON.parse(user.fruits || '{}'); } catch(e) { userFruits = {}; }
    try { userGarden = JSON.parse(user.garden || '{}'); } catch(e) { userGarden = {}; }

    // --- CÁC LỆNH HỆ THỐNG ECONOMY & TƯƠNG TÁC ---

    if (command === 'bal') {
        await message.reply(`💰 Bạn đang có **${user.balance.toLocaleString()}** Tcoin và **${user.cigarettes}** điếu thuốc trong người. (Dùng lệnh \`tkho\` để xem chi tiết kho).`);
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

    // --- GAME MINE (DÒ MÌN) ---
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
            await message.reply(`❌ Bạn không đủ **${bet}** Tcoin để chơi! Số dư hiện tại: **${user.balance.toLocaleString()}** Tcoin.`);
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

    // --- LỆNH TKISS ---
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

    // --- LỆNH THUG ---
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

    // --- LỆNH TDANCE ---
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

    // --- LỆNH XEM KHO (TKHO) ---
    if (command === 'tkho') {
        let seedListText = shopSeeds.map(s => `• ${s.name}: **${userSeeds[s.id] || 0}**`).join('\n');
        let fruitListText = shopSeeds.map(f => `• ${f.fruitName}: **${userFruits[f.id] || 0}**`).join('\n');
        
        let gardenStatus = 'Trống';
        if (userGarden.seedId) {
            let elapsed = Date.now() - userGarden.plantedAt;
            let totalTime = 120 * 60 * 60 * 1000;
            let remaining = totalTime - elapsed;
            if (remaining < 0) remaining = 0;
            let remHours = Math.floor(remaining / (1000 * 60 * 60));
            let remMinutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            gardenStatus = `Đang trồng **${userGarden.seedName}** | Tưới nước: ${userGarden.watered ? '✅ Đã tưới' : '❌ Chưa tưới'} | Còn lại: **${remHours}h ${remMinutes}p**`;
        }

        const khoEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(`🎒 Kho Đồ Của ${message.author.username}`)
            .addFields(
                { name: '🚬 Thuốc Lá', value: `Số lượng: **${user.cigarettes}** điếu`, inline: false },
                { name: '🌱 Hạt Giống Trong Kho', value: seedListText, inline: false },
                { name: '🍎 Quả Thu Hoạch Trong Kho', value: fruitListText, inline: false },
                { name: '🏡 Trạng Thái Vườn', value: gardenStatus, inline: false }
            )
            .setFooter({ text: 'Dùng lệnh tsell để bán quả lấy Tcoin!' });

        await message.reply({ embeds: [khoEmbed] });
    }

    // --- CỬA HÀNG (TSHOP) ---
    if (command === 'tshop') {
        const type = args[1] ? args[1].toLowerCase() : '';

        if (type === 'hatgiong' || type === 'seed') {
            const seedEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🌱 Cửa Hàng Hạt Giống Làm Vườn')
                .setDescription('Dùng lệnh `tbuy seed [tên]` để mua hạt giống! (Ví dụ: `tbuy seed tao`, `tbuy seed cam`, `tbuy seed buoi`)');

            shopSeeds.forEach(item => {
                seedEmbed.addFields({
                    name: `ID [${item.id}] - ${item.name}`,
                    value: `💵 Giá mua: **${item.price.toLocaleString()} Tcoin** | 💰 Giá bán quả: **${item.sellPrice.toLocaleString()} Tcoin/quả**\n📝 *${item.desc}*`,
                    inline: false
                });
            });
            await message.reply({ embeds: [seedEmbed] });
        } 
        else if (type === 'thuocla' || type === 'thuoc') {
            const shopEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🛒 Cửa Hàng Thuốc Lá')
                .setDescription('Dùng lệnh `tbuy [id]` để mua thuốc lá! (Ví dụ: `tbuy 1`)');

            shopCigarettes.forEach(item => {
                shopEmbed.addFields({
                    name: `ID [${item.id}] - ${item.name}`,
                    value: `💵 Giá: **${item.price.toLocaleString()} Tcoin** | 📦 Số lượng: **${item.amount} điếu**\n📝 *${item.desc}*`,
                    inline: false
                });
            });
            await message.reply({ embeds: [shopEmbed] });
        } 
        else {
            const menuEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('🏪 Hệ Thống Cửa Hàng')
                .setDescription('Vui lòng chọn đúng danh mục cửa hàng bạn muốn xem:\n\n• `tshop thuocla` - Mở shop bán thuốc lá 🚬\n• `tshop hatgiong` - Mở shop bán hạt giống 🌱');
            await message.reply({ embeds: [menuEmbed] });
        }
    }

    // --- MUA HÀNG (TBUY) ---
    if (command === 'tbuy') {
        const subType = args[1] ? args[1].toLowerCase() : '';

        if (subType === 'seed' || subType === 'hatgiong') {
            const seedId = args[2] ? args[2].toLowerCase() : '';
            const selectedSeed = shopSeeds.find(i => i.id === seedId);

            if (!selectedSeed) {
                await message.reply('⚠️ Vui lòng chọn đúng loại hạt giống: `tao`, `cam`, `buoi`. (Ví dụ: `tbuy seed tao`)');
                return;
            }

            if (user.balance < selectedSeed.price) {
                await message.reply(`❌ Bạn không đủ tiền! Cần **${selectedSeed.price.toLocaleString()} Tcoin**.`);
                return;
            }

            const newBalance = user.balance;

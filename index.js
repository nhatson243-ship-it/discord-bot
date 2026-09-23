const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
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
            cigarettes INTEGER DEFAULT 0,
            seeds TEXT DEFAULT '{}',
            fruits TEXT DEFAULT '{}',
            garden TEXT DEFAULT '{}'
        )
    `);
    
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

// --- CẤU HÌNH SHOP ---
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

// Đã cập nhật ảnh sang ảnh CÂY TRỒNG TRĨU QUẢ (Táo, Cam, Quýt, Bưởi)
const shopSeeds = [
    { 
        id: 'tao', 
        name: '🍎 Hạt giống Cây Táo', 
        fruitName: '🍎 Quả Táo',
        price: 10000, 
        sellPrice: 50000,
        image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb', // Hình ảnh cây táo
        desc: 'Trồng và thu hoạch những trái táo đỏ mọng.' 
    },
    { 
        id: 'cam', 
        name: '🍊 Hạt giống Cây Cam', 
        fruitName: '🍊 Quả Cam',
        price: 10000, 
        sellPrice: 50000,
        image: 'https://images.unsplash.com/photo-1547514701-42782101795e', // Hình ảnh cây cam trĩu quả
        desc: 'Cây cam mọng nước, giàu Vitamin C.' 
    },
    { 
        id: 'quyt', 
        name: '🍊 Hạt giống Cây Quýt', 
        fruitName: '🍊 Quả Quýt',
        price: 10000, 
        sellPrice: 50000,
        image: 'https://images.unsplash.com/photo-1557800636-894aeca4c1ae', // Hình ảnh cây quýt
        desc: 'Quýt ngọt thơm ngon, dễ trồng.' 
    },
    { 
        id: 'buoi', 
        name: '🍈 Hạt giống Cây Bưởi', 
        fruitName: '🍈 Quả Bưởi',
        price: 10000, 
        sellPrice: 50000,
        image: 'https://images.unsplash.com/photo-1536939459926-301728717817', // Hình ảnh cây bưởi
        desc: 'Bưởi năm roi siêu to khổng lồ.' 
    }
];

client.on('messageCreate', async message => {
    if (message.author.bot) return;

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

    if (command === 'bal') {
        await message.reply(`💰 Bạn đang có **${user.balance.toLocaleString()}** Tcoin và **${user.cigarettes}** điếu thuốc trong người. (Dùng lệnh \`tkho\` để xem chi tiết kho).`);
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
        await message.reply(`🎉 Bạn đã nhận thành công **${bonus}** Tcoin từ điểm danh hàng ngày!`);
    }

    // --- CỬA HÀNG (TSHOP, TSHOP THUOCLA, TSHOP HATGIONG) ---
    if (command === 'tshop') {
        const type = args[1] ? args[1].toLowerCase() : '';

        if (type === 'hatgiong' || type === 'seed') {
            const seedEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('🌱 Cửa Hàng Hạt Giống Làm Vườn')
                .setDescription('Dùng lệnh `tbuy seed [tên]` để mua hạt giống! (Ví dụ: `tbuy seed tao`, `tbuy seed quyt`)');

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
                await message.reply('⚠️ Vui lòng chọn đúng loại hạt giống: `tao`, `cam`, `quyt`, `buoi`. (Ví dụ: `tbuy seed quyt`)');
                return;
            }

            if (user.balance < selectedSeed.price) {
                await message.reply(`❌ Bạn không đủ tiền! Cần **${selectedSeed.price.toLocaleString()} Tcoin**.`);
                return;
            }

            const newBalance = user.balance - selectedSeed.price;
            userSeeds[selectedSeed.id] = (userSeeds[selectedSeed.id] || 0) + 1;

            await db.run(`UPDATE users SET balance = ?, seeds = ? WHERE userId = ?`, [newBalance, JSON.stringify(userSeeds), userId]);

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Mua Hạt Giống Thành Công!')
                .setDescription(`🌱 Bạn đã mua **${selectedSeed.name}**!\n💵 Giá: **${selectedSeed.price.toLocaleString()} Tcoin**\n💰 Số dư còn lại: **${newBalance.toLocaleString()} Tcoin**`)
                .setImage(selectedSeed.image);
            await message.reply({ embeds: [embed] });
            return;
        }

        const itemId = parseInt(args[1]);
        const selectedItem = shopCigarettes.find(i => i.id === itemId);

        if (!selectedItem) {
            await message.reply('⚠️ Vui lòng dùng lệnh `tshop thuocla` để xem ID thuốc lá hoặc `tshop hatgiong` để mua hạt giống!');
            return;
        }

        if (user.balance < selectedItem.price) {
            await message.reply(`❌ Bạn không đủ tiền! Cần **${selectedItem.price.toLocaleString()} Tcoin**.`);
            return;
        }

        const newBalance = user.balance - selectedItem.price;
        const newCigarettes = user.cigarettes + selectedItem.amount;

        await db.run(`UPDATE users SET balance = ?, cigarettes = ? WHERE userId = ?`, [newBalance, newCigarettes, userId]);

        const buyEmbed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Mua Thuốc Lá Thành Công!')
            .setDescription(`📦 Bạn đã mua **${selectedItem.amount} điếu** (${selectedItem.name})!\n💵 Giá: **${selectedItem.price.toLocaleString()} Tcoin**`)
            .setImage(selectedItem.image);

        await message.reply({ embeds: [buyEmbed] });
    }

    // --- LỆNH BÁN QUẢ (TSELL) ---
    if (command === 'tsell') {
        const fruitId = args[1] ? args[1].toLowerCase() : '';
        const targetSeed = shopSeeds.find(i => i.id === fruitId);

        if (!targetSeed) {
            await message.reply('⚠️ Vui lòng nhập đúng loại quả muốn bán! Ví dụ: `tsell tao 1` hoặc `tsell all tao`. Các loại: `tao`, `cam`, `quyt`, `buoi`.');
            return;
        }

        let currentFruitCount = userFruits[targetSeed.id] || 0;
        if (currentFruitCount <= 0) {
            await message.reply(`❌ Bạn không có **${targetSeed.fruitName}** nào trong kho để bán!`);
            return;
        }

        let sellAmount = 0;
        const amountArg = args[2] ? args[2].toLowerCase() : '1';

        if (amountArg === 'all') {
            sellAmount = currentFruitCount;
        } else {
            sellAmount = parseInt(amountArg);
            if (isNaN(sellAmount) || sellAmount <= 0) {
                await message.reply('⚠️ Số lượng bán không hợp lệ!');
                return;
            }
        }

        if (sellAmount > currentFruitCount) {
            await message.reply(`❌ Bạn chỉ có **${currentFruitCount}** ${targetSeed.fruitName} trong kho thôi!`);
            return;
        }

        userFruits[targetSeed.id] -= sellAmount;
        if (userFruits[targetSeed.id] <= 0) delete userFruits[targetSeed.id];

        const totalEarn = sellAmount * targetSeed.sellPrice;
        const newBalance = user.balance + totalEarn;

        await db.run(`UPDATE users SET balance = ?, fruits = ? WHERE userId = ?`, [newBalance, JSON.stringify(userFruits), userId]);

        const sellEmbed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('💰 Bán Quả Thành Công!')
            .setDescription(`🛍️ Bạn đã bán **${sellAmount}** ${targetSeed.fruitName}!\n💵 Nhận được: **${totalEarn.toLocaleString()} Tcoin**\n💰 Số dư mới: **${newBalance.toLocaleString()} Tcoin**`);
        await message.reply({ embeds: [sellEmbed] });
        return;
    }

    // --- LỆNH TRỒNG CÂY (TTRONGCAY) ---
    if (command === 'ttrongcay') {
        const seedId = args[1] ? args[1].toLowerCase() : '';
        const selectedSeed = shopSeeds.find(i => i.id === seedId);

        if (!selectedSeed) {
            await message.reply('⚠️ Vui lòng chọn loại hạt giống muốn trồng! Ví dụ: `ttrongcay tao`, `ttrongcay cam`, `ttrongcay quyt`, `ttrongcay buoi`.');
            return;
        }

        if (!userSeeds[selectedSeed.id] || userSeeds[selectedSeed.id] <= 0) {
            await message.reply(`❌ Bạn không có **${selectedSeed.name}** trong kho! Hãy dùng lệnh \`tshop hatgiong\` để mua.`);
            return;
        }

        if (userGarden.seedId) {
            await message.reply('❌ Vườn của bạn đang có cây trồng rồi! Hãy chờ thu hoạch hoặc hái quả trước khi trồng cây mới.');
            return;
        }

        userSeeds[selectedSeed.id] -= 1;
        if (userSeeds[selectedSeed.id] <= 0) delete userSeeds[selectedSeed.id];

        userGarden = {
            seedId: selectedSeed.id,
            seedName: selectedSeed.name,
            fruitName: selectedSeed.fruitName,
            plantedAt: Date.now(),
            watered: false,
            image: selectedSeed.image
        };

        await db.run(`UPDATE users SET seeds = ?, garden = ? WHERE userId = ?`, [JSON.stringify(userSeeds), JSON.stringify(userGarden), userId]);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🌱 Trồng Cây Thành Công!')
            .setDescription(`🏡 Bạn đã gieo trồng **${selectedSeed.name}** xuống mảnh vườn.\n⏳ Thời gian lớn: **120 giờ**.\n💧 Nhớ dùng lệnh \`ttuoicay\` hàng ngày nhé!`)
            .setImage(selectedSeed.image); // Hiển thị hình ảnh cây trồng trĩu quả
        await message.reply({ embeds: [embed] });
    }

    // --- LỆNH TƯỚI CÂY (TTUOICAY) ---
    if (command === 'ttuoicay') {
        if (!userGarden.seedId) {
            await message.reply('❌ Vườn của bạn đang trống! Hãy dùng lệnh `ttrongcay [loại]` để trồng cây.');
            return;
        }

        userGarden.watered = true;
        await db.run(`UPDATE users SET garden = ? WHERE userId = ?`, [JSON.stringify(userGarden), userId]);
        await message.reply('💧 Bạn đã tưới nước cho cây đầy đủ! Cây đang lớn lên từng ngày.');
    }

    // --- LỆNH HÁI QUẢ (THAIQUA) ---
    if (command === 'thaiqua') {
        if (!userGarden.seedId) {
            await message.reply('❌ Vườn của bạn không có cây nào để hái quả!');
            return;
        }

        const growTime = 120 * 60 * 60 * 1000; // 120 giờ
        const elapsedTime = Date.now() - userGarden.plantedAt;

        if (elapsedTime < growTime) {
            const remaining = growTime - elapsedTime;
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            await message.reply(`⏳ Cây chưa lớn! Vui lòng đợi thêm **${hours} giờ ${minutes} phút** nữa (Tổng thời gian nuôi là 120h).`);
            return;
        }

        const sId = userGarden.seedId;
        const fruitDisplayName = userGarden.fruitName;
        const fruitImage = userGarden.image;

        userFruits[sId] = (userFruits[sId] || 0) + 1;
        userGarden = {};

        await db.run(`UPDATE users SET fruits = ?, garden = ? WHERE userId = ?`, [JSON.stringify(userFruits), JSON.stringify(userGarden), userId]);

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle('🎉 Thu Hoạch Thành Công!')
            .setDescription(`🍎 Bạn đã hái thành công **1 ${fruitDisplayName}** và cất vào kho!\n🎒 Dùng lệnh \`tkho\` để kiểm tra kho hoặc \`tsell ${sId} 1\` để bán lấy Tcoin.`)
            .setImage(fruitImage);
        await message.reply({ embeds: [embed] });
    }

    // --- CÁC LỆNH KHÁC ---
    if (command === 'thutthuoc') {
        if (user.cigarettes <= 0) {
            await message.reply('❌ Bạn đã hết thuốc lá rồi! Hãy dùng lệnh `tshop thuocla` để mua thêm.');
            return;
        }
        await db.run(`UPDATE users SET cigarettes = cigarettes - 1 WHERE userId = ?`, [userId]);
        await message.reply(`🚬 **${message.author.username}** châm lửa và hút 1 điếu thuốc cực chill.`);
    }

    if (command === 'thelp') {
        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📜 Bảng Trợ Giúp - Tính Năng Làm Vườn & Kho Đồ')
            .addFields(
                { name: 'bal', value: 'Kiểm tra số dư Tcoin nhanh.', inline: false },
                { name: 'tkho', value: 'Kiểm tra chi tiết kho (Hạt giống, Thuốc lá, Quả trong kho).', inline: false },
                { name: 'tshop thuocla', value: 'Mở cửa hàng bán thuốc lá 🚬', inline: false },
                { name: 'tshop hatgiong', value: 'Mở cửa hàng bán hạt giống làm vườn 🌱', inline: false },
                { name: 'tbuy [id]', value: 'Mua thuốc lá theo ID (Ví dụ: `tbuy 1`).', inline: false },
                { name: 'tbuy seed [tên]', value: 'Mua hạt giống cây trồng (Ví dụ: `tbuy seed quyt`).', inline: false },
                { name: 'ttrongcay [tao/cam/quyt/buoi]', value: 'Trồng hạt giống xuống vườn (Hiện ảnh cây trĩu quả).', inline: false },
                { name: 'ttuoicay', value: 'Tưới nước chăm sóc cây.', inline: false },
                { name: 'thaiqua', value: 'Hái quả đưa vào kho sau khi cây lớn đủ 120h.', inline: false },
                { name: 'tsell [loại] [số lượng/all]', value: 'Bán quả trong kho lấy Tcoin (Ví dụ: `tsell quyt 1` hoặc `tsell all quyt`).', inline: false },
                { name: 'thutthuoc', value: 'Hút thuốc lá trong kho.', inline: false },
                { name: 'thelp', value: 'Xem hướng dẫn.', inline: false }
            );
        await message.reply({ embeds: [helpEmbed] });
    }
});

client.login(process.env.DISCORD_TOKEN);

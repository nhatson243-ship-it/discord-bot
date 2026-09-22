const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function addMoney() {
    // Kết nối tới database sqlite của bot
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    const userId = '1433082881051332610';
    const moneyToAdd = 1000000000; // 1 tỷ tcoin (ông có thể thêm số 0 nếu muốn 1000 tỷ)

    let user = await db.get('SELECT * FROM users WHERE userId = ?', [userId]);
    if (user) {
        await db.run('UPDATE users SET balance = balance + ? WHERE userId = ?', [moneyToAdd, userId]);
        console.log(`Đã cộng thêm 1 tỷ Tcoin cho user: ${userId}`);
    } else {
        await db.run('INSERT INTO users (userId, balance) VALUES (?, ?)', [userId, moneyToAdd]);
        console.log(`Đã tạo tài khoản và tặng 1 tỷ Tcoin cho user: ${userId}`);
    }
    
    await db.close();
}

addMoney();
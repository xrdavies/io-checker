const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');
const dotenv = require('dotenv');

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API_TOKEN = process.env.API_TOKEN;

async function checkDeviceStatus(deviceId, workName) {
  try {
    const response = await axios.get(`https://api.io.solutions/v1/io-worker/devices/${deviceId}/details`, {
      headers: {
        'token': API_TOKEN
      }
    });
    const data = response.data;

    if (data.status === 'succeeded' && data.data.status !== 'up') {
      await sendTelegramNotification(`Alert: Device "${workName}" (ID: ${deviceId}) is not up. Current status: ${data.data.status}`);
    } else {
      console.log(`Device ${deviceId} (${workName}) status: ${data.data.status}`);
    }
  } catch (error) {
    const errorMessage = `Error checking device ${deviceId} (${workName}): ${error.message}`;
    console.error(errorMessage);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data)}`);
    }
    await sendTelegramNotification(errorMessage);
  }
}

async function sendTelegramNotification(message) {
  try {
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });
    console.log(`Notification sent: ${message}`);
  } catch (error) {
    console.error(`Error sending Telegram notification: ${error.message}`);
  }
}

async function processCSV() {
  const devices = [];

  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream('devices.csv')
        .pipe(csv())
        .on('data', (row) => {
          devices.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    for (const device of devices) {
      await checkDeviceStatus(device['device id'], device['work name']);
    }
  } catch (error) {
    const errorMessage = `Error processing CSV: ${error.message}`;
    console.error(errorMessage);
    await sendTelegramNotification(errorMessage);
  }
}

async function main() {
  try {
    await processCSV();
  } catch (error) {
    const errorMessage = `Unhandled error in main execution: ${error.message}`;
    console.error(errorMessage);
    await sendTelegramNotification(errorMessage);
  }
}

main().catch(async (error) => {
  const errorMessage = `Critical error: ${error.message}`;
  console.error(errorMessage);
  await sendTelegramNotification(errorMessage);
});

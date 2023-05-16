const models = require("./models");
const { Kafka } = require('kafkajs');
const { API } = require("vk-io")

const kafka = new Kafka({
  clientId: 'vk-notification',
  brokers: ['127.0.0.1:9092'],
})

const consumer = kafka.consumer({ groupId: 'test-group2' })
const api = new API({token: process.env.TOKEN});

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}

async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'VKSend', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = JSON.parse(message.value);
      const to = (await models.User.findOne({
        attributes: ["vk"],
        where: {
          id: value.to
        }
      })).dataValues.vk;
      if (!to) {
        return
      }
      const from = (await models.User.findOne({
        attributes: ["username"],
        where: {
          id: value.from
        }
      })).dataValues.username;
      const textmessage = `Вы получили сообщение от ${from} на сайте forshielders.ru:\n${value.text}`;
      try {
        await api.messages.send({
          user_id: to, 
          random_id: message.offset,
          message: textmessage
        });
      } catch (e) {
        console.log(`Cannot send message to ${to}: ${e}`);
      }
    }
  })
}

setTimeout(run, 5000);
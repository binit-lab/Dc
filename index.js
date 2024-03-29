const Discord = require("discord.js");
const bot = new Discord.Client;
const token = 'process.env.Token';
const owner = '567685022270750721';
const roblox = require("noblox.js");

let prefix = null;

const mongoose = require('mongoose');
mongoose.connect("mongodb+srv://user:sA9ZEOlOamvuZmnV@cluster0.xpr1z.mongodb.net/giveaways?retryWrites=true&w=majority", { useUnifiedTopology: true, useNewUrlParser: true }).then(() => console.log("connected to database.")).catch(err => console.log("Error:", err));
let giveawaysTimeout;

const serverInfoSchema = new mongoose.Schema({
  giveawayChannel: String,
  prefix: String,
  identifier: String,
  giveawayMessage: String,
  giveawaysGoing: Boolean,
  amountPerGiveaway: Number,
  timePerGiveaway: Number,
  groupid: Number,
  cookie: String
});

const memberProfileSchema = new mongoose.Schema({
  userid: String,
  amount: Number
});

const serverInfoModel = mongoose.model('serverinfo', serverInfoSchema);

const memberProfileModel = mongoose.model('profile', memberProfileSchema);

function change(id, type, amount){
  var promise = new Promise((resolve, reject) => {
    let fetchedData = memberProfileModel.findOne({ userid: id }, (err, data) => {
      if(err) reject(err);
      if(type == "add"){
        fetchedData.updateOne({ amount: data.amount + amount }).then(() => resolve()).catch(err => reject(err));
      }else{
        fetchedData.updateOne({ amount: data.amount - amount }).then(() => resolve()).catch(err => reject(err));
      }
    })
  })
  return promise;
}

function login(cookie){
  var promise = new Promise((resolve, reject) => {
    if(cookie){
      let fetchedData = serverInfoModel.findOne({ identifier: "540" }, (err, data) => {
        if(err) return reject(err);
        fetchedData.updateOne({ cookie: cookie }).then(() => {
          roblox.setCookie(cookie).then(() => resolve("Set the cookie succesfully!")).catch(err => { if(err) reject(err) });
        });
      })
    }else {
      serverInfoModel.findOne({ identifier: "540" }, (err, data) => {
        if(err) return reject(err);
        roblox.setCookie(data.cookie).then(() => resolve("Set the cookie succesfully!")).catch(err => { if(err) reject(err) });
      })
    }
  })
  return promise;
}

function getIdFromUsername(username){
  var promise = new Promise((resolve, reject) => {
    roblox.getIdFromUsername(username).then(id => resolve(id)).catch(err => reject(err));
  })
  return promise;
}

function payout(userid, groupid, discordid, username){
  var promise = new Promise((resolve, reject) => {
    var fetchedData = memberProfileModel.findOne({ userid: discordid }, (err, data) => {
      if(err){
        return reject(err);
      }
      if(data == null){
        return resolve("You don't have any claimable robux...");
      }
      if(data.amount == 0){
        return resolve("You don't have any claimable robux...");
      }
      roblox.groupPayout({ group: groupid, member: userid, amount: data.amount }).then(() => {
        fetchedData.updateOne({ amount: 0 }).then(resolve(`Payed out **${data.amount}** to **${username}**.`)).catch(err => reject(err));
      }).catch(err => reject(err));
    })
  });
  return promise;
}

function getRandomPerson(people) {
    let winner = people.random();
    if(winner.id == bot.user.id){
      return getRandomPerson(people);
    }else{
      return winner;
    }
}

function getWinner(data, giveawayChannel){
  var promise = new Promise((resolve, reject) => {
    var oldMsg = giveawayChannel.messages.cache.get(data.giveawayMessage);
    oldMsg.delete().catch(() => {});
    const oldMsgReactions = oldMsg.reactions.cache.get("🎉");
    const people = oldMsgReactions.users.cache;
    if(oldMsgReactions.count == 1){
      return resolve("A winner could not be decided.");
    }
    const winner = getRandomPerson(people);
    const updateThis = memberProfileModel.findOne({ userid: winner.id }, (err, data1) => {
      if(err) throw err;
      if(data1 == undefined){
        memberProfileModel({ userid: winner.id, amount: data.amountPerGiveaway }).save(() => resolve(`Congrats ${winner}! You have won ${data.amountPerGiveaway}R$! type **${data.prefix}withdraw <roblox-username>** to claim.`));
      }else{
        const sum = data1.amount + data.amountPerGiveaway;
        updateThis.updateOne({ amount: sum }).then(() => resolve(`Congrats ${winner}! You have won ${data.amountPerGiveaway}R$! type **${data.prefix}withdraw <roblox-username>** to claim.`));
      }
    })
  });
  return promise;
}


function run(data1){
    giveawaysTimeout = setTimeout(() => {
      const fetchedData = serverInfoModel.findOne({ identifier: "540" }, (err, data) => {
        if(err){
          return console.log(err);
        }
        const giveawayChannel = bot.channels.cache.get(data.giveawayChannel);
        if(giveawayChannel == undefined){
          return console.log("No giveaway channel with that id found, please set a new channel.");
        }
        getWinner(data, giveawayChannel).then(msg1 => {
          giveawayChannel.send(msg1);
          giveawayChannel.send(`The giveaway for **${data.amountPerGiveaway}R$** has started. React with 🎉 to enter! (ends in **${data1.timePerGiveaway}** minutes!) ||@here||`).then(msg => {
            msg.react("🎉");
            fetchedData.updateOne({ giveawayMessage: msg.id }).catch(err => console.log(err));
          });
        }).catch(err => console.log(err))
        run(data);
    });
  }, 1000 * 60 * data1.timePerGiveaway);
}

bot.on("ready", ready => {
  bot.user.setActivity('RC', { type: 'WATCHING' }).then(() => console.log(`The bot is online, and is logged into "${bot.user.username}"`)).catch(err => console.log(err));
  login().then(() => console.log("logged in")).catch(err => console.log("Invalid Cookie, please use <prefix>setcookie <cookie>"));
  //serverInfoModel({ giveawayChannel: "13132", prefix: "!", identifier: "540", giveawayMessage: "9203840", giveawaysGoing: false, timePerGiveaway: 1, amountPerGiveaway: 1, cookie: "_uIUHIURHIUhidsadwd", groupid: 923840 }).save();
  //memberProfileModel({ userid: '92013902830918230', amount: 0 }).save(() => console.log('saved'));
});

bot.on('message', message => {
  if(message.author.id == bot.user.id){
    return;
  }
  if(message.channel.type == 'dm'){
    return;
  }
  if(message.author.id == owner){
    let dataCollected = serverInfoModel.findOne({ identifier: "540"}, (err, data) => {
      if(err){
        return console.log(err);
      }
      if(message.content.toLowerCase() == `${data.prefix}setchannel`){
        dataCollected.updateOne({ giveawayChannel: message.channel.id }).then(() => message.channel.send("This channel was updated to the channel used for giveaways!")).catch(err => message.channel.send("Error!"));
      }else if (message.content.toLowerCase().startsWith(`${data.prefix}setprefix`)){
        var black = "``";
        const args = message.content.substring(data.prefix.length).split(" ");
        if(!args[1]) return message.channel.send("Please tell me what to set the prefix to.");
        dataCollected.updateOne({ prefix: args[1] }).then(() => {
          message.channel.send(`The Prefix was set to ${black}${args[1]}${black}`);
          prefix = args[1];
        }).catch(err => message.channel.send("Error!"));
      }else if (message.content.toLowerCase() == `${data.prefix}start`){
        const giveawayChannel = bot.channels.cache.get(data.giveawayChannel);
        giveawayChannel.send(`The giveaway for **${data.amountPerGiveaway}R$** has started. React with 🎉 to enter! (ends in **${data.timePerGiveaway}** minutes!) ||@here||`).then(msg => {
            msg.react("🎉");
            dataCollected.updateOne({ giveawayMessage: msg.id }).catch(err => console.log(err));
          });
        run(data);
      }else if(message.content.toLowerCase().startsWith(`${data.prefix}stop`)){
        clearTimeout(giveawaysTimeout);
        message.channel.send("Stopped the giveaways.");
      }else if(message.content.toLowerCase().startsWith(`${data.prefix}settime`)){
        let args = message.content.substring(data.prefix.length).split(" ");
        if(!args[1]) return message.channel.send("You need to tell me how many minutes to set the time to.");
        if(isNaN(args[1])) return message.channel.send("Thats not a valid number.");
        dataCollected.updateOne({ timePerGiveaway: parseInt(args[1]) }).then(() => message.channel.send(`I have set the time to **${args[1]}** minutes`)).catch(err => message.channel.send("Error!"));
      }else if(message.content.toLowerCase().startsWith(`${data.prefix}setamount`)){
        let args = message.content.substring(data.prefix.length).split(" ");
        if(!args[1]) return message.channel.send("You must tell me how much to set the robux given per giveaway");
        if(isNaN(args[1])) return message.channel.send("You must give me an actual number.");
        dataCollected.updateOne({ amountPerGiveaway: parseInt(args[1]) }).then(() => message.channel.send(`I have set the amount of robux given to: **${args[1]}**`)).catch(err => console.log(err));
      }else if(message.content.toLowerCase().startsWith(`${data.prefix}robux`)){
        let personToCheck;
        let target = message.mentions.users.first();
        if(target){
          personToCheck = target;
        }else {
          personToCheck = message.author;
        }
        memberProfileModel.findOne({ userid: personToCheck.id }, (err, data1) => {
          if(err) return message.channel.send("Error.");
          if(data1 == undefined){
            memberProfileModel({ userid: message.author.id, amount: 0 }).save(() => message.channel.send(`${personToCheck} has **0** robux thats claimable.`));
          }else{
            message.channel.send(`${personToCheck} has **${data1.amount}** robux thats claimable.`);
          }
        })
      }else if(message.content.toLowerCase().startsWith(`${data.prefix}setcookie`)){
        message.delete();
        let args = message.content.split(" ");
        login(args[1]).then(msg => message.channel.send(msg)).catch(err => message.channel.send("Error: this may be because your cookie is invalid"));
      }else if(message.content.toLowerCase().startsWith(`${data.prefix}setgroup`)){
        let args = message.content.split(" ");
        if(!args[1]) return message.channel.send("Please specify a group id");
        if(isNaN(args[1])) return message.channel.send("Invalid id");
        dataCollected.updateOne({ groupid: parseInt(args[1]) }).then(() => message.channel.send("The group id has been set!")).catch(err => { if(err) message.channel.send("Error.") });
      }else if(message.content.toLowerCase().startsWith(`${data.prefix}withdraw`)){
        let args = message.content.split(" ");
        getIdFromUsername(args[1]).then(id => {
          payout(id, data.groupid, message.author.id, args[1]).then(msg => message.channel.send(msg)).catch(err => message.channel.send(`Error! Make sure you joined our group and that the group funds are higher then the withdrawl amount! https://www.roblox.com/groups/${data.groupid}/about`))
        }).catch(err => message.channel.send("Invalid username."));
      }else if(message.content.toLowerCase().startsWith(`${data.prefix}add`)){
        let args = message.content.split(" ");
        let target = message.mentions.users.first();
        if(!target){
          return message.channel.send(`Specify a person to add to.`)
        }
        if(args[1]){
          if(!args[2]) return message.channel.send("Please specify an amount.");
          if(isNaN(args[2])) return message.channel.send("That is not a valid number.");
          var amount = parseInt(args[2]);
          change(target.id, "add", amount).then(() => message.channel.send(`Added **${amount}** robux to ${target}!`));
        }else{
          message.channel.send("Invalid syntax, no amount specified.");
        }
      }else if(message.content.toLowerCase().startsWith(`${data.prefix}remove`)){
        let args = message.content.split(" ");
        let target = message.mentions.users.first();
        if(!target){
          return message.channel.send(`Specify a person to remove points from.`)
        }
        if(args[1]){
          if(!args[2]) return message.channel.send("Please specify an amount to remove from that person.")
          if(isNaN(args[2])) return message.channel.send("Please use a valid number.");
          var amount = parseInt(args[2]);
          change(target.id, "remove", amount).then(() => message.channel.send(`Removed **${amount}** robux to ${target}!`));
        }else{
          message.channel.send("Invalid syntax, no amount specified.");
        }
      }
    })
  }else{
    if(prefix == null){
      var fetchedData = serverInfoModel.findOne({ identifier: "540" }, (err, data) => {
        prefix = data.prefix;
      });
    }else{
      if(!message.content.startsWith(prefix)) return;
      var fetchedData = serverInfoModel.findOne({ identifier: "540" }, (err, data) => {
        if(message.content.toLowerCase().startsWith(`${data.prefix}withdraw`)){
          let args = message.content.split(" ");
          getIdFromUsername(args[1]).then(id => {
            payout(id, data.groupid, message.author.id, args[1]).then(msg => message.channel.send(msg)).catch(err => message.channel.send(`Error! Make sure you joined our group and that the group funds are higher then the withdrawl amount! https://www.roblox.com/groups/${data.groupid}/about`))
          }).catch(err => message.channel.send("Invalid username."));
        }else if(message.content.toLowerCase().startsWith(`${data.prefix}robux`)){
          let personToCheck;
          const target = message.mentions.users.first();
          if(target){
            personToCheck = target;
          }else {
            personToCheck = message.author;
          }
          memberProfileModel.findOne({ userid: personToCheck.id }, (err, data1) => {
            if(err) return message.channel.send("Error.");
            if(data1 == undefined){
              memberProfileModel({ userid: message.author.id, amount: 0 }).save(() => message.channel.send(`${personToCheck} has **0** robux thats claimable.`));
            }else{
              message.channel.send(`${personToCheck} has **${data1.amount}** robux thats claimable.`);
            }
          })
        }
      });
    }
  }
})

bot.login(token);

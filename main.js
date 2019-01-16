const Discord = require('discord.js');
const client = new Discord.Client();
const imageHash = require('imghash');
const sqlite3 = require('sqlite3');
const fs = require('fs');
const ini = require('ini');

let db = new sqlite3.Database('./poke.db');
let config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));

let sDict = [];
let regExPattern = "You caught a level [0-9]* (.*)!";
let regExPrefix = "Guess the pokémon and type (.*) <pokémon> to catch it!";

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if(msg.author.id == 365975655608745985) {
      if(msg.content.indexOf("Congratulations") >= 0){
        let result = msg.content.match(regExPattern);
        if(result)
          for(let i = sDict.length -1; i >= 0 ; i--) {
              if (sDict[i].id == msg.channel.id && sDict[i].hash !== undefined ) {
                  db.run("INSERT INTO data (hash, name) VALUES ('" + sDict[i].hash + "', '" + result[1] + "')", function () {
                      console.log("[ #" + msg.channel.name +" ] " + sDict[i].hash + " as " + result[1] + " registered");
                      sDict.splice(i, 1);
                  });
              }
          }
      }
      for (let embed of msg.embeds) { // these are some of the properties
        if(embed.description == null)
          return;
        let regEx = embed.description.match(regExPrefix);
        if(regEx == null)
          return;
        else
          if (embed.description == "Guess the pokémon and type "+ regEx[1] +" <pokémon> to catch it!") {
              let request = require('request').defaults({ encoding: null });
              request.get(embed.image.url, function (err, res, body) {
                  imageHash
                      .hash(body)
                      .then((hash) => {
                          db.get("SELECT name FROM data WHERE hash = '" + hash + "'", [],(err, row) => {
                              if (err) {
                                  return;
                              }
                              //msg.channel.send("p!catch " + row.name);
                              if(row) {
                                  console.log("Trying to catch: " + row.name);
                                  setTimeout(function() {
                                      msg.channel.send(regEx[1] + " " + row.name.toLowerCase());
                                  }, config.default.delay);
                              }
                              else {
                                  console.log("[ #" + msg.channel.name +" ] " + hash + " is not in our database");
                                  let exists = false;
                                  for(let x of sDict)
                                      if(x.id == msg.channel.id)
                                          exists = true;
                                  if(!exists)
                                      sDict.push({
                                          id: msg.channel.id,
                                          hash: hash
                                      });
                              }
                          });
                      });
              });
          }
      }
  }
});

db.serialize(function() {
    db.run("CREATE TABLE IF NOT EXISTS data (hash TEXT, name TEXT)");
});

client.login(config.default.token);
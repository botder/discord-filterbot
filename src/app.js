const Discord = require("discord.js");
const fs = require("fs");

if (!fs.existsSync("config/discord.json")) {
    console.error("Error: config/discord.json doesn't exist");
    process.exit();
}

const client = new Discord.Client();
const config = require("./../config/discord.json");

if (!config.token) {
    console.error("Error: Configuration file is missing the bot token");
    process.exit();
}

if (!config.channel) {
    console.error("Error: Configuration file is missing the channel id");
    process.exit();
}

if (!Array.isArray(config.ignored_roles)) {
    console.error("Error: Configuration file is missing the ignored roles array");
    process.exit();
}

let userWarnings = new Map();

client.on("ready", () => {
    console.log(`${client.user.tag} bot is now ready`);
});

client.on("message", message => {
    if (message.channel.id !== config.channel) {
        return;
    }

    if (message.system || !message.guild || message.author.bot) {
        return;
    }

    if (!message.deletable) {
        return;
    }

    if (message.member.roles.some(role => config.ignored_roles.includes(role.name))) {
        return;
    }

    let reason = false;

    if (message.attachments.size > 0) {
        let imagesOnly = true;

        for (let attachment of message.attachments.values()) {
            if (!attachment.width || !attachment.height) {
                reason = "Message attachments must be images";
                imagesOnly = false;
                break;
            }

            if (attachment.width < 640 || attachment.height < 480) {
                reason = "Screenshot is smaller than 640x480";
                imagesOnly = false;
                break;
            }
        }

        if (imagesOnly) {
            return;
        }
    } else {
        reason = "You must include a screenshot in your message (minimum size: 640x480)";
    }

    message.delete()
        .then(() => {
            const userId = message.author.id;

            if (reason && !userWarnings.get(userId)) {
                userWarnings.set(userId, true);

                message.channel.send(`${message.author}, your message has been deleted: ${reason}`)
                    .then(warningMessage => {
                        if (warningMessage.deletable) {
                            client.setTimeout(() => {
                                userWarnings.delete(userId);

                                warningMessage.delete()
                                    .catch(error => {
                                        console.error("Failed to delete reason message:", error.message);
                                    });
                            }, 8000);
                        } else {
                            userWarnings.delete(userId);
                        }
                    })
                    .catch(error => {
                        userWarnings.delete(userId);
                        console.error("Failed to send delete reason message:", error.message);
                    });
            }

            console.log(`Message ${message.id} by ${message.author.tag} (${message.author.id}) deleted (${message.attachments.size} attachments): ${message.content}`);
        })
        .catch(error => {
            console.error("Failed to delete message:", error.message);
        });
});

client.login(config.token)
    .catch(error => {
        console.error("Error:", error.message);
        process.exit();
    });

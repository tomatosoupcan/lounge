"use strict";

var Chan = require("../../models/chan");
var Msg = require("../../models/msg");
const webpush = require('web-push');
webpush.setGCMAPIKey('<GCM-API>'); //hard-coded api key will need to be swapped out for a config file line somewhere
webpush.setVapidDetails(
	'mailto:example@gmail.com',
	'<vapid-public>',
	'<vapid-private>'
); //vapid details need to be generated once somewhere and stored or added to config file somewhere
const pushSub = {
	endpoint: '<endpoint>',
	keys: {
		auth: '<auth>',
		p256dh: '<p256dh>'
	}
}; //push destinations are currently hard-coded after being copied out from the prompt window, this will need to be replaced with some form of http communication and db storage for push details more than likely




module.exports = function(irc, network) {
	var client = this;

	irc.on("notice", function(data) {
		// Some servers send notices without any nickname
		if (!data.nick) {
			data.from_server = true;
			data.nick = network.host;
		}

		data.type = Msg.Type.NOTICE;
		handleMessage(data);
	});

	irc.on("action", function(data) {
		data.type = Msg.Type.ACTION;
		handleMessage(data);
	});

	irc.on("privmsg", function(data) {
		data.type = Msg.Type.MESSAGE;
		handleMessage(data);
	});

	irc.on("wallops", function(data) {
		data.from_server = true;
		data.type = Msg.Type.NOTICE;
		handleMessage(data);
	});

	function handleMessage(data) {
		let chan;
		let highlight = false;
		const self = data.nick === irc.user.nick;

		// Server messages go to server window, no questions asked
		if (data.from_server) {
			chan = network.channels[0];
		} else {
			var target = data.target;

			// If the message is targeted at us, use sender as target instead
			if (target.toLowerCase() === irc.user.nick.toLowerCase()) {
				target = data.nick;
			}

			chan = network.getChannel(target);
			if (typeof chan === "undefined") {
				// Send notices that are not targeted at us into the server window
				if (data.type === Msg.Type.NOTICE) {
					chan = network.channels[0];
				} else {
					chan = new Chan({
						type: Chan.Type.QUERY,
						name: target
					});
					network.channels.push(chan);
					client.emit("join", {
						network: network.id,
						chan: chan
					});
				}
			}

			// Query messages (unless self) always highlight
			if (chan.type === Chan.Type.QUERY) {
				highlight = !self;
			}
		}

		// Self messages in channels are never highlighted
		// Non-self messages are highlighted as soon as the nick is detected
		if (!highlight && !self) {
			highlight = network.highlightRegex.test(data.message);
		}

		var msg = new Msg({
			type: data.type,
			time: data.time,
			mode: chan.getMode(data.nick),
			from: data.nick,
			text: data.message,
			self: self,
			highlight: highlight
		});
		chan.pushMessage(client, msg, !self);

		if (highlight === true){
			webpush.sendNotification(pushSub, data.nick + ' says:♭' + data.message);
		} //would need to check against db and send to all subscribed devices, for whatever reason this only allows sending straight text, so I am sending with a char I think won't ever be used and then splitting back out on that on the client
	}
};

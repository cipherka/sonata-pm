client.ws.on('INTERACTION_CREATE', (interaction) => {
	if(interaction.data.component_type == 2 && interaction.data.custom_id.split('-')[0] == "secret_message") {
		database.query("SELECT * FROM secret_messages WHERE id = ?", [interaction.data.custom_id.split('-')[1]], (err, rows) => {
			if(err) return client.sendError(err.stack);
			client.api.interactions(interaction.id, interaction.token).callback.post({
				data: {
					type: 4,
					data: {
						flags: 64,
						content: (
							!rows[0] ||
							(rows[0] && rows[0].message_type == "for" && !rows[0].allowed_users.includes(interaction.member.user.id)) ||
							(rows[0] && rows[0].message_type == "except" && rows[0].allowed_users.includes(interaction.member.user.id))
						)
							? "Вы не можете просмотреть это сообщение."
							: rows[0].message,
					}
				}
			});
		});
	}

	if(interaction.data.name && interaction.data.name == "pm") {
		let allowed_users = [];
		Object.keys(interaction.data.resolved.members).map(key => allowed_users.push(key))

		if(interaction.data.options.find(data => data.name == "type").value == "for")
			allowed_users.push(interaction.member.user.id);

		database.query("INSERT INTO secret_messages SET ?", {
			message_type: interaction.data.options.find(data => data.name == "type").value,
			allowed_users: JSON.stringify(allowed_users),
			message: interaction.data.options.find(data => data.name == "message").value
		}, async (err, row) => {
			if(err) return client.sendError(err.stack);	
			await client.api.interactions(interaction.id, interaction.token).callback.post({
				data: {
					type: 4,
					data: {
						flags: 64,
						content: ":mailbox_with_mail: Доставляем ваше сообщение..",
					}
				}
			});

			client.api.channels(interaction.channel_id).messages.post({
				data: {
					content: `${interaction.data.options.find(data => data.name == "type").value == "for" ? `${allowed_users.filter(x => interaction.member.user.id !== x).map(x => `<@!${x}>`)} Вам` : `Всем-всем, кроме ${allowed_users.map(x => `<@!${x}>`)}`} пришло сообщение!`,
					components: [
						{
							type: 1,
							components: [
								{
									type: 2,
									style: 3,
									custom_id: `secret_message-${row.insertId}`,
									label: "Прочитать сообщение"
								}
							]
						}
					]
				}
			});
		});
	}
});

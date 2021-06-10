---
title: "ChatbotAttachmentSecurity"
id: "chatbotattachmentsecurity"
---

API Name: global.ChatbotAttachmentSecurity

```js
var ChatbotAttachmentSecurity = Class.create();
ChatbotAttachmentSecurity.prototype = {
	initialize: function() {
	},

	canRead: function(sysAttachment) {
		if (sysAttachment.table_name.nil() || (sysAttachment.table_name.indexOf("sys_cs_conversation") <= -1 && sysAttachment.table_name.indexOf("sys_cs_conversation_task") <= -1)) {
			return false;
		}
				
		var vaConversationId = sysAttachment.table_sys_id;
		
		// Get VA conversation if table_name is "sys_cs_conversation_task"
		if(sysAttachment.table_name.indexOf("sys_cs_conversation_task") > -1) {
			vaConversationId = this.getConversationFromTask(sysAttachment.table_sys_id);
		}		
				
		// Check if handoff record exists for this VA conversationId
		var handoffRecord = new GlideRecord("sys_cs_connect_handoff");
		handoffRecord.addQuery("cs_conversation", vaConversationId);
		handoffRecord.query();
		if(!handoffRecord.next()) {
			return false;
		}
		var connectGroup = handoffRecord.getValue("connect_group");
		// Check if user is assigned a chat_entry with specified connect Group
		var chatQueueRecord = new GlideRecord("chat_queue_entry");
		chatQueueRecord.addQuery("assigned_to",gs.getUserID());
		chatQueueRecord.addQuery("group",connectGroup);
		chatQueueRecord.query();
		return chatQueueRecord.next();
	},
		
	getConversationFromTask: function(taskId) {
		var conversationTaskRecord = new GlideRecord("sys_cs_conversation_task");
		conversationTaskRecord.get(taskId);
		if(conversationTaskRecord.isValidRecord()) {
			return conversationTaskRecord.getValue("conversation");
		}
	},
	
type: 'ChatbotAttachmentSecurity'
};
```
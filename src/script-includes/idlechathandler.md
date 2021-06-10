---
title: "IdleChatHandler"
id: "idlechathandler"
---

API Name: global.IdleChatHandler

```js
var IdleChatHandler = Class.create();
IdleChatHandler.prototype = {
    initialize: function() {},

    process: function(idle_reminder_timeout, idle_cancel_timeout) {
        var conversations = {};
        // Get All conversations which are `chatInProgress` state, device_type != adapter and the client is online
        var gr = new GlideRecord("sys_cs_session_binding");
        gr.addQuery("topic.state", "chatInProgress");
        gr.addEncodedQuery("topic.device_type!=adapter");
        gr.addNullQuery("topic.conversation_completed");
        gr.addQuery("online", true);
        gr.query();
        while (gr.next()) {
            conversations[gr.getValue("topic")] = gr.topic.getRefRecord().getValue('sys_updated_on');
        }

        // Set Last Client Activity times for the conversations
        this.setLastClientActivityTimes(conversations);

        // Idle Reminder Threshold based on `idle_reminder_timeout` (given in seconds)
        var idleReminderThreshold = new GlideDateTime().getNumericValue() - (idle_reminder_timeout * 1000); // In Millis
        // Idle Cancel Threshold based on `idle_cancel_timeout` (given in seconds)
        var idleCancelThreshold = new GlideDateTime().getNumericValue() - (idle_cancel_timeout * 1000); // In Millis

        var toBeCancelledConversations = [];
        var toBeRemindedConversations = [];
        var removeReminderConversations = [];

        for (var conversationId in conversations) {

            if (!sn_cs.VASystemObject.isLiveChatInProgress(conversationId)) {
                continue;
            }

            var lastActivityTime = new GlideDateTime(conversations[conversationId]).getNumericValue(); //In Millis

            /* 
               Client lastActivityTime is after the idleReminderThreshold
               
               CLIENT HAS BECOME ACTIVE AFTER REMINDER IS SENT
            */

            if (lastActivityTime >= idleReminderThreshold) {
                removeReminderConversations.push(conversationId);
                continue;
            }

            /*
            	 Client lastActivityTime is before the idleReminderThreshold
            	 Client lastActivityTime is after the idleCancelThreshold
            	 
            	 CLIENT NEEDS TO BE SENT A REMINDER THAT HE IS INACTIVE
            */

            if (lastActivityTime < idleReminderThreshold && lastActivityTime >= idleCancelThreshold) {
                toBeRemindedConversations.push(conversationId);
                continue;
            }

            /*
            	Client lastActivityTime is before the idleCancelThreshold
            	
            	CLIENT HAS BEEN INACTIVE EVEN AFTER THE REMINDER IS SENT				
            */

            if (lastActivityTime < idleCancelThreshold) {
                toBeCancelledConversations.push(conversationId);
            }
        }

        this.removeReminderConversations(removeReminderConversations);
        this.sendReminderConversations(toBeRemindedConversations);
        this.updateCancelledConversations(toBeCancelledConversations);

    },

    // Consider only last `inbound` message
    setLastClientActivityTimes: function(conversations) {
        var gr = new GlideAggregate("sys_cs_message");
        gr.addQuery("conversation", "IN", Object.keys(conversations).join(","));
        gr.addQuery("direction", "inbound");
        gr.addAggregate("MAX", "sys_updated_on");
        gr.groupBy('conversation');
        gr.query();
        while (gr.next()) {
            conversations[gr.getValue("conversation")] = gr.getAggregate('MAX', 'sys_updated_on');
        }
    },

    // Client has become active, No need to send reminder, mark the client 'online'
    removeReminderConversations: function(conversations) {
        var gr = new GlideRecord("sys_cs_session_binding");
        gr.addQuery("topic", "IN", conversations);
        gr.setValue('sent_reminder', false);
        gr.setValue('online', true);
        gr.updateMultiple();
    },

    // Client has been inactive, Send a reminder
    sendReminderConversations: function(conversations) {
        var gr = new GlideRecord("sys_cs_session_binding");
        gr.addQuery("topic", "IN", conversations);
        gr.setValue('sent_reminder', true);
        gr.updateMultiple();
    },

    // Client has been inactive since long even though the reminder is send
    // Cancel the conversation and mark the client offline
    updateCancelledConversations: function(conversations) {
        var gr = new GlideRecord("sys_cs_session_binding");
        gr.addQuery("topic", "IN", conversations);
        gr.setValue('online', false);
        gr.updateMultiple();
    },

    //Look for session bindings that have the client_connected set to false
    //if they haven't been updated in a given amount of time, cancel the conversation
    processDisconnectedSessions: function (disconnect_timeout) {
        var disconnectedThreshold = new GlideDateTime();
        // subtract the timeout value from current date/time to get threshold
        // look for anything disconnected before that date/time
        disconnectedThreshold.addSeconds(-1 * disconnect_timeout);

        var gr = new GlideRecord("sys_cs_session_binding");
        gr.addQuery("topic.state", "chatInProgress");
        gr.addNullQuery("topic.conversation_completed");
        gr.addQuery("topic.device_type", "!=", "adapter");
        gr.addQuery("online", true);
        gr.addQuery("client_connected", false);
        gr.addQuery("sys_updated_on", "<", disconnectedThreshold.getValue())
        gr.query();

        var toBeCancelledConversations = [];

        while(gr.next()) {
            toBeCancelledConversations.push(gr.getValue("topic"));
        }

        this.updateCancelledConversations(toBeCancelledConversations);
	},

    type: 'IdleChatHandler'
};
```
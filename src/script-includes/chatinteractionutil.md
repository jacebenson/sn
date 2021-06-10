---
title: "ChatInteractionUtil"
id: "chatinteractionutil"
---

API Name: global.ChatInteractionUtil

```js
var ChatInteractionUtil = Class.create();
ChatInteractionUtil.prototype = {
    initialize: function() {
    }, 
	
	getInteractionByGroup: function(groupID) {
		var interactionMetaDataDocumentID = "";
		var handOffGlideRecord = new GlideRecord('sys_cs_connect_handoff');
		if(handOffGlideRecord.get('connect_group', groupID)) {
			interactionMetaDataDocumentID = handOffGlideRecord.cs_conversation;
		} else {
			interactionMetaDataDocumentID = groupID;
		}
		var interaction = new GlideRecord('interaction');
		interaction.get('channel_metadata_document', interactionMetaDataDocumentID);
		return interaction;
	},
	
	getRequesterLanguage: function(interaction) {
        var requesterLanguage = gs.getSession().getLanguage()+'';
		var contextGR = new GlideRecordSecure('interaction_context');
		contextGR.addQuery('interaction', interaction.sys_id);
		contextGR.addQuery('name', 'requester_session_language');
		contextGR.query();
		if(contextGR.next()){requesterLanguage = contextGR.getValue('value');}
		return requesterLanguage;
    },
	
	getAgentLanguage: function(interaction) {
        var agentLanguage = gs.getSession().getLanguage()+'';
		var contextGR = new GlideRecordSecure('interaction_context');
		contextGR.addQuery('interaction', interaction.sys_id);
		contextGR.addQuery('name', 'liveagent_session_language');
		contextGR.query();
		if(contextGR.next()){agentLanguage = contextGR.getValue('value');}
		return agentLanguage;
    },
	
	getDynamicTranslateLanguage: function(interaction) {
		var dynaicTranslateProp = GlideProperties.get('com.glide.cs.dynamic.translation.enable.virtual_agent', false);
		if(dynaicTranslateProp){
			return this.getAgentLanguage(interaction);
		} else{
			return this.getRequesterLanguage(interaction);
		}
	},
	
	updateInteractionContext: function(interactionID, jsonObj) {
		var keys = [];
		var contextVar = [];
		var contextVarGr = new GlideRecord("interaction_context");
		contextVarGr.addQuery("interaction", interactionID);
		contextVarGr.query();
		//store existing interaction_context records for this specific interaction
		while (contextVarGr.next()) { 
			contextVar[contextVarGr.name] = {
				sysID: contextVarGr.getUniqueValue() + '',
				value: contextVarGr.value + '',
			};
		}
        // Add or update values for variables in the json
		for (var key in jsonObj) {
			keys.push(key);
			//if interaction_context record does not exist, add it
			if(contextVar[key].value === undefined){ 
				var newValGr = new GlideRecord("interaction_context");
					newValGr.initialize();
					newValGr.interaction = interactionID;
					newValGr.name = key;
					newValGr.value = jsonObj[key];
					newValGr.insert();
			} else if(contextVar[key].value != jsonObj[key]){ //if value is different, update it
				var oldValGr = new GlideRecord("interaction_context");
					oldValGr.get(contextVar[key].sysID);
					oldValGr.value = jsonObj[key];
					oldValGr.update();
			}		
		}
		return keys;
    },
	

    type: 'ChatInteractionUtil'
};
```
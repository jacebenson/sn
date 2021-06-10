---
title: "AJAXMessagingUtils"
id: "ajaxmessagingutils"
---

API Name: global.AJAXMessagingUtils

```js
var AJAXMessagingUtils = Class.create();
AJAXMessagingUtils.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    /*
     * is called from from Agent Messaging store app to decide showing 'Compose SMS' UI action
     * returns boolean
     */
    showComposeSMS: function(channelSysId) {
        var extensionPoints = new GlideScriptedExtensionPoint().getExtensions('global.AgentInitiatedConversationUtil');
        for (var i = 0; i < extensionPoints.length; i++) {
            //highest order (lowest number on order field in sys_extension_instance) picked first
            var point = extensionPoints[i];
            if (point.isValid(channelSysId)) {
                if (point.getSendFrom(channelSysId).length == 0)
                    return false;
                return true;
            }
        }
        if (this._getProviders(channelSysId).length > 0) {
            return true;
        }
        return false;
    },

    /*
     * Called via AJAX
     * applies any available valid extension point for given channel sys id.
     * if there is no extension point defined, returns list of application_providers matching channel sysid
     * returns provider, clients and unique_sys_id (placeholder sysid for document attachment)
     */

    getApplicationProvidersWithExtnPointAjax: function() {
        var result = {};
        result['application_providers'] = [];
        result['clients'] = [];
        result['unique_sys_id'] = gs.generateGUID();
        var tableName = this.getParameter('sysparm_table');
        var sysid = this.getParameter('sysparm_sys_id');
        var channelSysId = this.getParameter('sysparm_channel_sysid');
        var extensionPoints = new GlideScriptedExtensionPoint().getExtensions('global.AgentInitiatedConversationUtil');
        for (var i = 0; i < extensionPoints.length; i++) {
            if (extensionPoints[i].isValid(channelSysId)) {
                //highest order (lowest number on order field in sys_extension_instance) picked first
                var point = extensionPoints[i];
                result['application_providers'] = point.getSendFrom(channelSysId);
                if (!gs.nil(tableName) && !gs.nil(sysid))
                    result['clients'] = point.getSendTo(channelSysId, tableName, sysid);
                break;
            }
        }
        if (result['application_providers'].length == 0)
            result['application_providers'] = this._getProviders(channelSysId);
        return new global.JSON().encode(result);
    },

    /*
     * If none, returns opened_for field of interaction
     * Returns user record associated with interaction based on extension point
     */
    getUserRecord: function() {
        var interaction_sys_id = this.getParameter('interaction_sys_id');
        var gr = new GlideRecord('interaction');
        var user = {};
        if (gr.get(interaction_sys_id)) {
            /* Internally calls InteractionChannelUserProfileExtPoint getUserElementForInteraction
             * highest order (lowest number on order field in sys_extension_instance) picked first
             */
            var result = new sn_cs.ChannelUserProfileUtils().getUserElementForInteraction(gr);
            if (!gs.nil(result) && !gs.nil(result.getValue())) {
                user.sys_id = result.getValue();
                user.table = result.getReferenceTable();
            }
        }
        return new global.JSON().encode(user);
    },

    /*
     * returns interaction sysid if successful
     */
    sendMessageAjax: function() {
        var provider_id = this.getParameter('provider_id');
        var provider_number = this.getParameter('provider_number');
        var to_number = this.getParameter('to_number');
        var message = this.getParameter('message');
        var profile_table = this.getParameter('profile_table');
        var profile_sysid = this.getParameter('profile_sysid');
        var attachment_sysid = this.getParameter('attachment_sysid');
        var result = new sn_cs.MessageSetupScriptObject().messageSetup(provider_id, provider_number, to_number, message, profile_table, profile_sysid, attachment_sysid);
        return JSON.stringify(result);
    },

   /*
    * Clear attachment
    */
    clearSysAttachmentRecord: function() {
                var sys_id = this.getParameter('sys_id');
                var grAttachment = new GlideRecord('sys_attachment');
                grAttachment.addQuery('table_name', 'interaction');
                grAttachment.addQuery('table_sys_id', sys_id);
                grAttachment.query();
                if (grAttachment.next()) {
                        grAttachment.deleteRecord();
                }
                return true;
     },

    /*
     * returns provider application with maching channel sys id
     */

    _getProviders: function(channelSysId) {
        var providers = [];
        if (!channelSysId)
            return providers;
        var providerAppGR = new GlideRecord('sys_cs_provider_application');
        providerAppGR.addQuery('provider.channel', channelSysId);
        providerAppGR.query();
        while (providerAppGR.next()) {
            providers.push({
                'sys_id': providerAppGR.getValue('sys_id'),
                'name': providerAppGR.getValue('name'),
                'provider': providerAppGR.getValue('provider'),
                'inbound_id': providerAppGR.getValue('inbound_id')
            });
        }

        return providers;
    },

    /*
     * returns union of all phone numbers from document table and sys_cs_channel_user_profile matching the document table
     * removes duplicate if number from user table and sys_cs_channel_user_profile are same
     * preference given to phone field in user table
     */
    _getClients: function(channelSysId, table, sys_id) {
        var clients = [];
        var gr = new GlideRecord(table);

        if (gr.isValid() && gr.get(sys_id)) {
            var fields = new GlideRecordUtil().getFields(gr);
            for (var field in fields) {
                if (gr.getElement(fields[field]).getED().getInternalType() == 'ph_number' && gr.getValue(fields[field]) != null) {
                    clients.push({
                        'number': gr.getValue(fields[field]),
                        'field_name': fields[field],
                        'label': gr.getElement(fields[field]).getLabel()
                    });
                }
            }
        }

        var chGR = new GlideRecord('sys_cs_channel_user_profile');
        chGR.addQuery('user_table', table);
        chGR.addQuery('user_document', sys_id);
        chGR.addQuery('channel', channelSysId);
        chGR.addActiveQuery();
        chGR.query();

        while (chGR.next()) {
            var channelUserId = chGR.getValue('channel_user_id');
            if (!this._containsChannelUserId(clients, channelUserId)) {
                clients.push({
                    'number': channelUserId,
                    'field_name': 'channel_users',
                    'label': 'Other'
                });
            }
        }

        return clients;
    },

    /*
     * private util method to check if phone numbers from user table and sys_cs_channel_user_profile are same
     */

    _containsChannelUserId: function(clients, channelUserId) {
        for (var i = 0; i < clients.length; i++) {
            if (clients[i].number == channelUserId)
                return true;
        }
        return false;
    },

    type: 'AJAXMessagingUtils'
});
```
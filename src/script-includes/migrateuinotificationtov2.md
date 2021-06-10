---
title: "MigrateUINotificationToV2"
id: "migrateuinotificationtov2"
---

API Name: global.MigrateUINotificationToV2

```js
var MigrateUINotificationToV2 = Class.create();
MigrateUINotificationToV2.prototype = {
    initialize: function() {},

    migrate: function(id) {
        var trigger = new GlideRecord('notification_trigger');
        if (!trigger.isValid()) {
            gs.warn('table notification_trigger is not found');
            return;
        }

        if (!trigger.get(id)) {
            gs.warn('unable to find trigger by id: ' + id);
            return;
        }

        var recipientUsers = [];
        var recipientFields = [];
        trigger.recipient_users.split(',').forEach(function(item) {
            if (item.startsWith('${') && item.endsWith('}')) {
                recipientFields.push(item.substring(2, item.length - 1));
            }

            if (GlideStringUtil.isEligibleSysID(item)) {
                var user = new GlideRecord('sys_user');
                if (user.get(item)) {
                    recipientUsers.push(item);
                }
            }
        });

        var notification = new GlideRecord('sys_notification');
        if (!notification.isValid()) {
            gs.warn('table sys_notification is not found');
            return;
        }

        notification.active = trigger.active;
        notification.table = trigger.collection;
        notification.triggered_by = 'record_change';
        notification.action_insert = trigger.action_insert;
        notification.action_update = trigger.action_update;
        notification.condition = trigger.condition;
        notification.recipient_users = recipientUsers.join(',');
        notification.recipient_fields = recipientFields.join(',');
        notification.include_originator = !trigger.exclude_creator;
        notification.name = trigger.name;
        notification.description = trigger.description;
        notification.order = trigger.order;
        notification.sys_domain = trigger.sys_domain;
        notification.sys_scope = trigger.sys_scope;
        notification.sys_overrides = trigger.sys_overrides;
        notification.insert();

        trigger.content.split(',').forEach(function(item) {
            var triggerContent = new GlideRecord('notification_content');
            if (!triggerContent.get(item)) {
                gs.warn('unable to find content by id: ' + item);
                return;
            }

            var workspaceContent = new GlideRecord('sys_notification_workspace_content');
            workspaceContent.active = true;
            workspaceContent.name = triggerContent.name;
            workspaceContent.route = triggerContent.route;
            workspaceContent.notification = notification.getUniqueValue();
            workspaceContent.insert();
        });

        gs.info('created new notification: ' + notification.getUniqueValue());
    },

    type: 'MigrateUINotificationToV2'
};
```
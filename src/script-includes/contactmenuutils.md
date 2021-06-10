---
title: "ContactMenuUtils"
id: "contactmenuutils"
---

API Name: global.ContactMenuUtils

```js
var ContactMenuUtils = Class.create();

ContactMenuUtils.prototype = {
    ICONS: {
        'Chat': 'c59b46a2530300109686ddeeff7b12c1',
        'Email': '81bbc2a2530300109686ddeeff7b12a7',
        'Link': '618876d3530300109686ddeeff7b12d0',
        'Phone': 'c8db0aa2530300109686ddeeff7b120b',
        'Text': '2498f6d3530300109686ddeeff7b120d'
    },

    ACTIVE_LABELS: {
        'Chat': 'contact_live_agent',
        'Phone': 'phone_call',
        'Email': 'send_email'
    },

    ACTIVE_LABELS_FOR_SYS_PROPERTIES: {
        'Chat': 'support_hours_label',
        'Phone': 'support_phone_label',
        'Email': 'support_email_label'
    },

    CONTACT_MENU: {
        'support_phone_label': 'Call Support (Daily 5AM - 11 PM)',
        'support_phone': '1-800-245-6000',
        'support_email_label': 'Send Email to Customer Support',
        'support_email': 'support@example.com',
        'support_hours_label': 'Contact Live Agent'
    },

    initialize: function(brandingGr) {
        this.brandingGr = brandingGr;
    },

    _getSysProperty: function(key) {
        var grProp = new GlideRecord('sys_properties');
        grProp.addQuery('name', 'com.glide.cs.branding.' + key);
        grProp.query();
        if (grProp.next()) {
            return grProp.getValue('value');
        }
        return this.CONTACT_MENU[key];
    },

    insertDefaultContactMenuItems: function() {
        if (this.brandingGr.getRowCount() == 1 && !this.brandingGR.isValidField('support_hours_label'))
            for (var key in this.CONTACT_MENU)
                this.CONTACT_MENU[key] = this._getSysProperty(key);

        this._insertChatMenuItem();
        this._insertPhoneMenuItem();
        this._insertEmailMenuItem();
    },

    insertDefaultIcon: function(contactMenuGr) {
        var attachmentSysId = this._insertAttachmentRecord(this.ICONS[contactMenuGr.getValue('type')], contactMenuGr.getUniqueValue());
        contactMenuGr.setValue('icon', attachmentSysId);
        contactMenuGr.update();
    },

    _getAttachmentGR: function(sysId) {
        var gr = new GlideRecord('sys_attachment');
        gr.get(sysId);
        return gr;
    },

    _insertAttachmentRecord: function(attachmentSysId, tableSysId) {
        var gr = this._getAttachmentGR(attachmentSysId);
        var sysIds = String(GlideSysAttachment.copy(gr.getValue('table_name'), gr.getValue('table_sys_id'), 'va_branding_contact_menu', tableSysId));

        // GlideSysAttachment.copy returns an string of sysIds separated by commas  -  the original attachment sysId, copy attachment sysId
        var newAttachmentSysId = sysIds.slice(sysIds.indexOf(',') + 1, sysIds.length - 1);
        var newAttachmentGr = this._getAttachmentGR(newAttachmentSysId);
        newAttachmentGr.setValue('sys_domain', this.brandingGr.getValue('sys_domain'));
        newAttachmentGr.update();

        return newAttachmentSysId;
    },

    _getVisible: function(type) {
        var visible = this.brandingGr.getValue(this.ACTIVE_LABELS[type]);
        return visible ? visible === '1' : this._getVisibleFromSysProperties(type);
    },

    _getVisibleFromSysProperties: function(type) {
        if (this.brandingGr.getValue('branding_key') === 'default_branding')
            return !!this._getSysProperty(this.ACTIVE_LABELS_FOR_SYS_PROPERTIES[type]);
        else
            return true;
    },

    _insertContactItem: function(item) {
        var gr = new GlideRecord('va_branding_contact_menu');
        if (this.brandingGr.getValue('branding_key') === 'default_branding') {
            gr.addQuery('branding', this.brandingGr.getUniqueValue());
            gr.addQuery('type', item['type']);
            gr.query();
            gr.next();
        } else {
            gr.initialize();
        }
        this._setValues(gr, item);
        gr.setWorkflow(false);
        gr.update();
        this.insertDefaultIcon(gr);
    },

    _insertChatMenuItem: function() {
        var item = {
            'label': this.brandingGr.getValue('support_hours_label') || this.CONTACT_MENU['support_hours_label'],
            'value': null,
            'visible': this._getVisible('Chat'),
            'display_wait_time': true,
            'type': 'Chat',
            'order': '1'
        };
        this._insertContactItem(item);
    },

    _insertPhoneMenuItem: function() {

        var item = {
            'label': this.brandingGr.getValue('support_phone_label') || this.CONTACT_MENU['support_phone_label'],
            'value': this.brandingGr.getValue('support_phone') || this.CONTACT_MENU['support_phone'],
            'visible': this._getVisible('Phone'),
            'type': 'Phone',
            'order': '2'
        };
        this._insertContactItem(item);
    },

    _insertEmailMenuItem: function() {

        var item = {
            'label': this.brandingGr.getValue('support_email_label') || this.CONTACT_MENU['support_email_label'],
            'value': this.brandingGr.getValue('support_email') || this.CONTACT_MENU['support_email'],
            'visible': this._getVisible('Email'),
            'type': 'Email',
            'order': '3'
        };
        this._insertContactItem(item);
    },

    _setValues: function(gr, item) {
        for (var key in item) {
            gr.setValue(key, item[key]);
        }
        gr.setValue('display_default_icon', true);
        gr.setValue('branding', this.brandingGr.getUniqueValue());
        gr.setValue('sys_scope', this.brandingGr.getValue('sys_scope'));
    },

    type: 'ContactMenuUtils'
};
```
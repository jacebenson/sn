---
title: "OCEscDesignerContactPrefUtilAjaxSNC"
id: "ocescdesignercontactprefutilajaxsnc"
---

API Name: global.OCEscDesignerContactPrefUtilAjaxSNC

```js
var OCEscDesignerContactPrefUtilAjaxSNC = Class.create();
OCEscDesignerContactPrefUtilAjaxSNC.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
	TABLES: {
		CMN_ROTA_CONTACT_PREFERENCE: 'cmn_rota_contact_preference'
	},
	
	ATTRS: {
		CMN_ROTA: 'cmn_rota',
		CMN_ROTA_ESCALATION_SET: 'cmn_rota_escalation_set',
		CMN_ROTA_CONTACT_PREFERENCE: 'cmn_rota_contact_preference',
		CONTACT_ATTEMPT: 'contact_attempt'
	},
	
    initialize: function(request, responseXML, gc) {
		AbstractAjaxProcessor.prototype.initialize.call(this, request, responseXML, gc);
    },

	/**
	* Returns highest contact attempt value in the associated contact preferences
	* based on the input type
	*
	* @param type		String (values => rota or escalation_set)
	* @param sysId		String (tables => cmn_rota or cmn_rota_escalation_set)
	* @returns {*}      Integer (contact_attempt)
	* 					-1 => error, 0 => Not found
	*/
	getHighestOrderContactAttempt: function (type, sysId) {
		if (!type || !sysId)
			return -1;
		
		var contactPrefGr = new GlideRecord(this.TABLES.CMN_ROTA_CONTACT_PREFERENCE);
		if (type == 'rota') {
			contactPrefGr.addQuery(this.ATTRS.CMN_ROTA, sysId);
			contactPrefGr.addNullQuery(this.ATTRS.CMN_ROTA_ESCALATION_SET);
		}
		else if (type == 'escalation_set'){
			contactPrefGr.addQuery(this.ATTRS.CMN_ROTA_ESCALATION_SET, sysId);
		}
	
		contactPrefGr.addNotNullQuery(this.ATTRS.CONTACT_ATTEMPT);
		contactPrefGr.orderByDesc(this.ATTRS.CONTACT_ATTEMPT);
		contactPrefGr.setLimit(1);
		contactPrefGr.query();
		if (contactPrefGr.next())
			return parseInt(contactPrefGr.getValue(this.ATTRS.CONTACT_ATTEMPT));
		
		return 0;
	},
	
	getHighestOrderContactAttemptAjax : function() {
		var type = this.getParameter("sysparm_type");
		var sysId = this.getParameter("sysparm_sysId");
		return this.getHighestOrderContactAttempt(type, sysId);
	},
	
    type: 'OCEscDesignerContactPrefUtilAjaxSNC'
});
```
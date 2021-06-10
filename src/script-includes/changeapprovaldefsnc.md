---
title: "ChangeApprovalDefSNC"
id: "changeapprovaldefsnc"
---

API Name: global.ChangeApprovalDefSNC

```js
var ChangeApprovalDefSNC = Class.create();
ChangeApprovalDefSNC.prototype = {

	APPROVAL_ACTION: "approval_action",
	APPROVER_SOURCE: "approver_source",
	CHG_APPROVAL_DEF: "chg_approval_def",
	CHANGE_REQUEST: "change_request",
	MANDATORY: "mandatory",
	GROUP: "group",
	GROUP_FIELD: "group_field",
	USER: "user",
	USER_FIELD: "user_field",
	WAIT_FOR: "wait_for",
	PERCENTAGE: "percentage",

	initialize: function(_gr, _gs) {
		this._gr = _gr || current;
		this._gs = _gs || gs;
		this.MAP_ACTION_TYPE = {
			"approve": this.USER,
			"reject": this.USER,
			"user": this.USER,
			"group": this.GROUP
		};
		this.MAP_FIELD_ACTION_TYPE = {
			"approve": this.USER_FIELD,
			"reject": this.USER_FIELD,
			"user": this.USER_FIELD,
			"group": this.GROUP_FIELD
		};
    },

	getApproval: function(chgReqGR, appAction, field, value, approverId) {
		var approval = {
			approval_action: "",
			approval_state: "",
			chg_approval_def: this._gr.getUniqueValue(),
			sysapproval_approver: "",
			sysapproval_group: "",
			sys_decision_question: "",
			target_id: "",
			target_type: "",
			mandatory: this._gr.getValue(this.MANDATORY) === "1" ? "true" : "false",
			wait_for: this._gr.getValue(this.WAIT_FOR),
			percentage: parseFloat(this._gr.getValue(this.PERCENTAGE))
		};

		var currAppAction = appAction || this._gr.getValue(this.APPROVAL_ACTION);
		var currField = field || this.getApprovalField(currAppAction);
		var fieldValue = value || this._gr.getValue(field);
		var currApproverId = approverId || fieldValue;
		if (!approverId) {
			if (this.GROUP_FIELD === currField)
				currApproverId = chgReqGR.getElement(fieldValue);
			else if (this.USER_FIELD === currField)
				currApproverId = chgReqGR.getElement(fieldValue);
		}	
		approval.approval_action = (currAppAction === "approve" || currAppAction === "reject") ? currAppAction : "";
		approval.target_id = currApproverId;
		approval.target_type = this.MAP_ACTION_TYPE[currAppAction];
		return approval;
	},

	getApprovals: function(chgReqGR) {
		var appAction = this._gr.getValue(this.APPROVAL_ACTION);
		var field = this.getApprovalField(appAction);
		var value = this._gr.getValue(field);
		var approverId = value;
		if (this.GROUP_FIELD === field)
			approverId = chgReqGR.getElement(value);
		else if (this.USER_FIELD === field)
			approverId = chgReqGR.getElement(value);
		var approvals = [];
		if (JSUtil.nil(approverId))
			return approvals;
		var approverIdArr = approverId.split(",");
		approverIdArr = approverIdArr || [];
		for (var i = 0; i < approverIdArr.length; i++) {
			var currApprovalObj = this.getApproval(chgReqGR, appAction, field, value, approverIdArr[i]);
			if (JSUtil.nil(currApprovalObj.target_id))
				continue;
			approvals.push(currApprovalObj);
		}
		return approvals;
	},

	getApprovalField: function(appAction) {
		var approvalField = "";
		var approverSource = this._gr.getValue(this.APPROVER_SOURCE);
		if (this.CHG_APPROVAL_DEF === approverSource)
			approvalField = this.MAP_ACTION_TYPE[appAction];
		else if (this.CHANGE_REQUEST === approverSource)
			approvalField = this.MAP_FIELD_ACTION_TYPE[appAction];
		return approvalField;
	},

    type: 'ChangeApprovalDefSNC'
};
```
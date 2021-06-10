---
title: "CABApprovalSNC"
id: "cabapprovalsnc"
---

API Name: sn_change_cab.CABApprovalSNC

```js
var CABApprovalSNC = Class.create();

// Initialize with the task gr for which you wish to get approvals
CABApprovalSNC.prototype = Object.extendsObject(CAB, {
	
	initialize: function(_gr, _gs) {
		CAB.prototype.initialize.call(this, _gr, _gs);

		this._requiresApproval = false;
		this._requiresUserApproval = false;
		this._approvals = {};
		this._delegated = [];
		this._approvalRecord = null;
		
		// Initialise object by getting all approvals for task, delegated approval and user approval for task.
		var approvalGr = new GlideRecord("sysapproval_approver");
		approvalGr.addQuery('sysapproval', this._gr.getUniqueValue());
		approvalGr.addQuery('state', 'requested');
		approvalGr.query();
		
		// Set the requresApproval flag if we have approvl records
		this._requiresApproval = approvalGr.hasNext();
		
		// Checking for current user approval
		while (approvalGr.next()) {
			var approvalApprover = approvalGr.approver + "";
			this._approvals[approvalApprover] = approvalGr.getUniqueValue();
			if (approvalApprover === this._gs.getUserID()) {
				this._requiresUserApproval = true;
				break;
			}
		}
		
		// If we don't need user approval at this point but there are approvals, check the delegates
		if (!this._requiresUserApproval && this._requiresApproval) {
			var delegateGr = new GlideRecord("sys_user_delegate");
			delegateGr.addQuery("delegate", this._gs.getUserID());
			delegateGr.addQuery("approvals", "true");
			delegateGr.addQuery("user", "IN", Object.keys(this._approvals).join(","));
			delegateGr.addQuery("starts", "<=", this._gs.daysAgo(0));
			delegateGr.addQuery("ends", ">=", this._gs.daysAgo(0));
			delegateGr.query();
		
			while (delegateGr.next())
				this._delegated.push(delegateGr.user + "");
			
			this._requiresUserApproval = Object.keys(this._approvals).some (
				function(key) {
					return this._delegated.indexOf(key) !== -1;
				}
			, this);
		}
	},
	
	requiresApproval: function() {
		return this._requiresApproval;
	},
	
	requiresUserApproval: function() {
		return this._requiresUserApproval;
	},
	
	// Gets an approval record which the current user can approve/reject
	getApprovalRecord: function() {
		if (this._approvalRecord !== null)
			return this._approvalRecord;
		
		if (!this._requiresUserApproval)
			return null;
		
		var appRec = new GlideRecord("sysapproval_approver");
		// Check for direct user approval
		if (this._approvals[this._gs.getUserID()]) {
			appRec.get(this._approvals[this._gs.getUserID()]);
			this._approvalRecord = appRec;
			return appRec;
		}
		// Check for delegated approval
		this._delegated.some(function(userId) {
			if (this._approvals[userId]) {
				appRec.get(this._approvals[userId]);
				this._approvalRecord = appRec;
				return true;
			}
		}, this);
		
		return this._approvalRecord;
		
	},
	
	setApprove: function(comment) {
		if (!this._requiresUserApproval)
			return null;
		
		var approvalGr = this.getApprovalRecord();
		if (approvalGr === null)
			return null;
		
		approvalGr.comments = comment;
		approvalGr.state = "approved";
		return approvalGr;
	},
	
	approve: function(comment) {		
		var approvalGr = this.setApprove(comment);
		if (approvalGr === null)
			return false;
		
		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[approve] Approving: \n" + JSON.stringify(this._toJS(approvalGr), null, 3));
		
		return approvalGr.update();
	},
	
	setReject: function(comment) {
		if (!this._requiresUserApproval)
			return null;
		
		var approvalGr = this.getApprovalRecord();
		if (approvalGr === null)
			return null;
		
		approvalGr.comments = comment;
		approvalGr.state = "rejected";
		return approvalGr;
	},
	
	reject: function(comment) {
		var approvalGr = this.setReject(comment);
		if (approvalGr === null)
			return false;
		
		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[reject] Rejecting: \n" + JSON.stringify(this._toJS(approvalGr), null, 3));
		
		return approvalGr.update();
	},
	
	// Output the approvals object required by CAB
	toJS: function() {
		return {
			"taskId": this._gr.getUniqueValue(),
			"requiresApproval": this._requiresApproval,
			"requiresUserApproval": this._requiresUserApproval
		};
	},

    type: 'CABApprovalSNC'
});
```
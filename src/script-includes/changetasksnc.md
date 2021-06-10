---
title: "ChangeTaskSNC"
id: "changetasksnc"
---

API Name: global.ChangeTaskSNC

```js
var ChangeTaskSNC = Class.create();

ChangeTaskSNC.prototype = {
	initialize: function(changeTaskGr) {
		this._log = new GSLog(ChangeCommon.LOG_PROPERTY, this.type);
		this._gr = changeTaskGr;
	},

	/**
	 * Checks whether a change task state is Pending
	 */
	isPending: function() {
		return this._gr.state + "" === ChangeTaskState.PENDING;
	},

	/**
	 * Checks whether the field in the record has changed to the Pending state
	 */
	changesToPending: function() {
		return this._gr.state.changes() && this.isPending();
	},

	/**
	 * Set the record's state to Pending but the record is not saved.
	 */
	setPending: function() {
		this._gr.state = ChangeTaskState.PENDING;
	},

	/**
	 * Change the state of the change task to Pending (the record is saved)
	 */
	pending: function() {
		this.setPending();
		return this._insertUpdate();
	},

	/**
	 * Checks whether a change task state is Open
	 */
	isOpen: function() {
		return this._gr.state + "" === ChangeTaskState.OPEN;
	},

	/**
	 * Checks whether the field in the record has changed to the Open state
	 */
	changesToOpen: function() {
		return this._gr.state.changes() && this.isOpen();
	},

	/**
	 * Set the record's state to Open but the record is not saved.
	 */
	setOpen: function() {
		this._gr.state = ChangeTaskState.OPEN;
	},

	/**
	 * Change the state of the change task to Open (the record is saved)
	 */
	open: function() {
		this.setOpen();
		return this._insertUpdate();
	},

	/**
	 * Checks whether a change task is in progress
	 */
	isInProgress: function() {
		return this._gr.state + "" === ChangeTaskState.IN_PROGRESS;
	},

	/**
	 * Checks whether the field in the record has changed to the In Progress state
	 */
	changesToInProgress: function() {
		return this._gr.state.changes() && this.isInProgress();
	},

	/**
	 * Set the record's state to In Progress but the record is not saved.
	 */
	setInProgress: function() {
		this._gr.state = ChangeTaskState.IN_PROGRESS;
	},

	/**
	 * Change the state of the change task to In Progress (the record is saved)
	 */
	inProgress: function() {
		this.setInProgress();
		return this._insertUpdate();
	},

	/**
	 * Checks whether a change task has been closed
	 */
	isClosed: function() {
		return this._gr.state + "" === ChangeTaskState.CLOSED ||
			this.isClosedSuccessful() ||
			this.isClosedSuccessfulWithIssues() ||
			this.isClosedUnsuccessful();
	},

	/**
	 * Checks whether the change task has been set to Closed + Successful state
	 */
	isClosedSuccessful: function() {
		return this._gr.state + "" === ChangeTaskState.CLOSED_SUCCESSFUL &&
			(JSUtil.nil(this._gr.close_code) || this._gr.close_code + "" === ChangeTaskState.CLOSED_SUCCESSFUL_CODE);
	},

	/**
	 * Checks whether the change task has been set to Closed + Successful with issues state
	 */
	isClosedSuccessfulWithIssues: function() {
		return this._gr.state + "" === ChangeTaskState.CLOSED_SUCCESSFUL_ISSUES &&
			(JSUtil.nil(this._gr.close_code) || this._gr.close_code + "" === ChangeTaskState.CLOSED_SUCCESSFUL_ISSUES_CODE);
	},

	/**
	 * Checks whether the change task has been set to Closed + Unsuccessful state
	 */
	isClosedUnsuccessful: function() {
		return this._gr.state + "" === ChangeTaskState.CLOSED_UNSUCCESSFUL &&
			(JSUtil.nil(this._gr.close_code) || this._gr.close_code + "" === ChangeTaskState.CLOSED_UNSUCCESSFUL_CODE);
	},

	/**
	 * Checks whether the field in the record has changed to the Closed state
	 */
	changesToClosed: function() {
		return this._gr.state.changes() && this.isClosed();
	},

	/**
	 * Set the record's state to closed according to the close code, but the record is not saved.
	 */
	setClose: function(closeCode, closeNotes) {
		switch (closeCode) {
			case ChangeTaskState.CLOSED_SUCCESSFUL_ISSUES_CODE:
				this.setCloseSuccessfulWithIssues(closeNotes);
				break;
			case ChangeTaskState.CLOSED_UNSUCCESSFUL_CODE:
				this.setCloseUnsuccessful(closeNotes);
				break;
			default:
				this.setCloseSuccessful(closeNotes);
		}
	},

	/**
	* Set close notes for the change task, but not save the record
	*/
	setCloseNotes: function(closeNotes){
		this._gr.close_notes = closeNotes;
	},

	/**
	 * Change the state of the change task to Closed (the record is saved) with the specified close code and close notes
	 */
	close: function(closeCode, closeNotes) {
		this.setClose(closeCode, closeNotes);
		return this._insertUpdate();
	},

	/**
	 * Change the state of the change task to Closed + Successful with the specified close notes without saving the record
	 */
	setCloseSuccessful: function(closeNotes) {
		this.setCloseNotes(closeNotes ? closeNotes : "Change task closed successful");
		this._gr.state = ChangeTaskState.CLOSED_SUCCESSFUL;
		this._gr.close_code = ChangeTaskState.CLOSED_SUCCESSFUL_CODE;
	},

	/**
	 * Change the state of the change task to Closed + Successful (the record is saved) with the specified close notes
	 */
	closeSuccessful: function(closeNotes) {
		this.setCloseSuccessful(closeNotes);
		return this._insertUpdate();
	},

	/**
	 * Change the state of the change task to Closed + Successful with issues and the specified close notes without saving the record
	 */
	setCloseSuccessfulWithIssues: function(closeNotes) {
		this.setCloseNotes(closeNotes ? closeNotes : "Change task closed successful with issues");
		this._gr.state = ChangeTaskState.CLOSED_SUCCESSFUL_ISSUES;
		this._gr.close_code = ChangeTaskState.CLOSED_SUCCESSFUL_ISSUES_CODE;
	},

	/**
	 * Change the state of the change task to Closed + Successful with issues (the record is saved) with the specified close notes
	 */
	closeSuccessfulWithIssues: function(closeNotes) {
		this.setCloseSuccessfulWithIssues(closeNotes);
		return this._insertUpdate();
	},

	/**
	 * Change the state of the change task to Closed + Unsuccessful with the specified close notes without saving the record
	 */
	setCloseUnsuccessful: function(closeNotes) {
		this.setCloseNotes(closeNotes ? closeNotes : "Change task closed unsuccessful");
		this._gr.state = ChangeTaskState.CLOSED_UNSUCCESSFUL;
		this._gr.close_code = ChangeTaskState.CLOSED_UNSUCCESSFUL_CODE;
	},

	/**
	 * Change the state of the change task to Closed + Unsuccessful (the record is saved) with the specified close notes
	 */
	closeUnsuccessful: function(closeNotes) {
		this.setCloseUnsuccessful(closeNotes);
		return this._insertUpdate();
	},

	/**
	 * Checks whether a change task is canceled
	 */
	isCanceled: function() {
		return this._gr.state + "" === ChangeTaskState.CANCELED;
	},

	/**
	 * Checks whether the field in the record has changed to the Canceled state
	 */
	changesToCanceled: function() {
		return this._gr.state.changes() && this.isCanceled();
	},

	/**
	 * Set the record's state to cancelled but the record is not saved.
	 */
	setCancel: function(closeNotes) {
		this._gr.state = ChangeTaskState.CANCELED;

		if (closeNotes)
			this._gr.close_notes = closeNotes;
	},

	/**
	 * Change the state of the change task to Canceled (the record is saved)
	 */
	cancel: function(closeNotes) {
		this.setCancel(closeNotes);
		return this._insertUpdate();
	},

	_insertUpdate: function() {
		return (this._gr.isNewRecord() ? this.insert() : this.update());
	},

	getValue: function(name) {
		return this._gr.getValue(name);
	},
	
	isOnHold: function() {
		if (!ChangeTask.hasOnHoldField())
			return false;
		
		return this._gr.on_hold;
	}, 
	
	setOnHoldReason: function(holdReason) {
		if (!ChangeTask.hasOnHoldField())
			return false;
		
		this._gr.setValue('on_hold_reason', holdReason);
	},
	
	setOnHold: function(holdValue) {
		if (!ChangeTask.hasOnHoldField())
			return false;
		
		this._gr.setValue('on_hold', holdValue);
	},
	
	onHold: function(holdValue, holdReason) {
		if (!ChangeTask.hasOnHoldField())
			return false;
		
		this.setOnHold(holdValue);
		this.setOnHoldReason(holdReason);
		return this._insertUpdate();
	},
	
	onHoldReason: function(newValue) {
		if (!ChangeTask.hasOnHoldField())
			return false;
		
		this.setOnHoldReason(newValue);
		return this._insertUpdate();
		
	},
	
	clearOnHold: function() {
		if (!ChangeTask.hasOnHoldField())
			return false;
		
		this.setOnHold(false);
		this.setOnHoldReason('');
		return this._insertUpdate();
	},

	toString: function() {
		return JSON.stringify(this.toJS());
	},

	toJS: function() {
		return ChangeCommon.toJS(this._gr);
	},

	insert: ChangeCommon.methods.insert,

	update: ChangeCommon.methods.update,

	deleteRecord: ChangeCommon.methods.deleteRecord,

	refreshGlideRecord: ChangeCommon.methods.refreshGlideRecord,

	getGlideRecord: ChangeCommon.methods.getGlideRecord,

	setValue: ChangeCommon.methods.setValue,

	setValues: ChangeCommon.methods.setValues,

	canWriteTo: ChangeCommon.methods.canWriteTo,

	type: 'ChangeTaskSNC'
};

ChangeTaskSNC.newChangeTask = function(nameValuePairs) {
	var changeTaskGr = new GlideRecord(ChangeTask.CHANGE_TASK);
	changeTaskGr.initialize();
	changeTaskGr.setValue("state", ChangeTask.DEFAULT_STATE);
	var changeTask = new ChangeTask(changeTaskGr);
	if (nameValuePairs) {
		if (!nameValuePairs.hasOwnProperty("change_request"))
			return null;

		changeTask.setValues(nameValuePairs);

		if (!changeTask.insert())
			return null;
	}
	return changeTask;
};

ChangeTaskSNC.bySysId = function(sysId) {
	if (!sysId)
		return null;

	var changeTaskGr = new GlideRecord(ChangeTask.CHANGE_TASK);
	changeTaskGr.addQuery("sys_id", sysId);
	changeTaskGr.query();
	if (!changeTaskGr.next())
		return null;

	return new ChangeTask(changeTaskGr);
};

ChangeTaskSNC.hasOnHoldField = function() {
	return GlideTableDescriptor.get('change_task').isValidField('on_hold');
};

```
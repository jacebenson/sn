---
title: "ChangePolicyApprovalActivitySNC"
id: "changepolicyapprovalactivitysnc"
---

API Name: global.ChangePolicyApprovalActivitySNC

```js
var ChangePolicyApprovalActivitySNC = Class.create();
ChangePolicyApprovalActivitySNC.prototype = Object.extendsObject(global.WFActivityHandler, {

    APPROVE: "approve",
    APPROVED: "approved",
    CANCELLED: "cancelled",
    DUPLICATE: "duplicate",
    FINISHED: "finished",
    MANDATORY: "mandatory",
    NOT_REQUIRED: "not_required",
    NOT_REQUESTED: "not requested",
    REJECTED: "rejected",
    REJECT: "reject",
    REQUESTED: "requested",
    SKIPPED: "skipped",
    SYSAPPROVAL_APPROVER: "sysapproval_approver",
    SYSAPPROVAL_GROUP: "sysapproval_group",
    WAITING: "waiting",

    initialize: function(_gr, _gs, _activity, _context, _workflow) {
        global.WFActivityHandler.prototype.initialize.call(this);

        this._gr = _gr || current;
        this._gs = _gs || gs;
        this._activity = _activity || activity;
        this._activity.result = null;
        this._context = _context || context;
        this._workflow = _workflow || workflow;
        this.setDatesFlag = false;
        this.approvalUtils = new global.WorkflowApprovalUtils();
        this.pendingStates = [this.NOT_REQUESTED, this.NOT_REQUIRED, this.REQUESTED];
        this.autoApprovalType = {};
        this.autoApprovalType[this.APPROVE] = this.APPROVED;
        this.autoApprovalType[this.REJECT] = this.REJECTED;
        this.log = new GSLog("com.snc.change_management.policy.approval.log", this.type).setLog4J();
    },

    onExecute: function() {
        this._setDueDate("");

        var chgPolAppGR = this._activity.vars.approval_policy.getRefRecord();
        if (!chgPolAppGR.isValidRecord()) {
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[onExecute] Change Approval Policy record not found. Applying default behavior and rejecting this Change Request");
            this._defaultReject(this._activity, this._gr, this._gs.getMessage("Change Approval Policy not found. Change Request has been rejected ({0}).", [this._activity.activity.name.toString()]));
            return;
        }

        if (parseInt(chgPolAppGR.getValue("active")) !== 1) { // if not active
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[onExecute] Change Approval Policy record is inactive. Applying default behavior and rejecting this Change Request");
            this._defaultReject(this._activity, this._gr, this._gs.getMessage("{0} is inactive. Change Request has been rejected ({1}).", [chgPolAppGR.getDisplayValue(), this._activity.activity.name.toString()]));
            return;
        }

        // Wait for workflow to be canceled by "Cancel Workflows Upon Cancellation" business rule on task table
        if (this._gr.state.changesTo(this._activity.vars.canceled_state)) {
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[onExecute] Change Request state has changed to Cancel. Applying default behavior and waiting for workflow to be cancelled");
            this._activity.state = this.WAITING;
            return;
        }

        var chgAppPolicy = new global.ChangePolicy(chgPolAppGR);
        var decisions = chgAppPolicy.evaluatePolicy(this._gr, this.runScript(this._activity.vars.policy_input) || {});

        if (!decisions || decisions.chg_approval_def.length === 0 || decisions.sys_decision_question.length === 0) {
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[onExecute] No Decisions matched this Change Request from the Change Approval Policy. Applying default behaviour and skipping this Change Approval Policy");
            this._defaultSkip(this._activity, this._gr, true, this._gs.getMessage("No Decisions matched. {0} has been skipped ({1}).", [chgPolAppGR.getDisplayValue(), this._activity.activity.name.toString()]));
            return;
        }

        var userApprovals = [];
        var groupApprovals = [];
        var autoApproval = false;
        if ("first" === chgPolAppGR.getValue("execution")) {
            // sys_decision_question's are ordered. Update collection to include first matched Decision only
            decisions.sys_decision_question = decisions.sys_decision_question.slice(0,1);
            // Update collection to include the first matched answer only
            decisions.chg_approval_def = [decisions.sys_decision_question[0].answer];
        }

        var chgAppDefGR = new GlideRecord("chg_approval_def");
        chgAppDefGR.addQuery("sys_id", decisions.chg_approval_def);
        chgAppDefGR.query();
        while (chgAppDefGR.next()) {
            var chgAppDef = new global.ChangeApprovalDef(chgAppDefGR);
            var approvalObjArr = chgAppDef.getApprovals(this._gr);
            if (approvalObjArr.length === 0)
                continue;
            if (this.autoApprovalType[approvalObjArr[0].approval_action])
                autoApproval = true;
            if ("group" === approvalObjArr[0].target_type)
                groupApprovals = groupApprovals.concat(approvalObjArr);
            else if ("user" === approvalObjArr[0].target_type)
                userApprovals = userApprovals.concat(approvalObjArr);
        }

        if (userApprovals.length === 0 && groupApprovals.length === 0) {
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[onExecute] No Approvals could be generated from matched Decisions. Applying default behaviour and skipping this Change Approval Policy");
            this._defaultSkip(this._activity, this._gr, true, this._gs.getMessage("No approvals were generated from matched Decisions. {0} has been skipped ({1}).", [chgPolAppGR.getDisplayValue(), this._activity.activity.name.toString()]));
            return;
        }

        // Log each approval in chg_policy_applied
        for (var j = 0; j < decisions.sys_decision_question.length; j++)
            this.logChgPolApplied(this._gr.getUniqueValue(), this._activity.vars.approval_policy, decisions.sys_decision_question[j].sys_id, decisions.sys_decision_question[j].answer);

        var userApprovalDefs = this._createUserApprovals(userApprovals, autoApproval);
        var groupApprovalDefs = this._createGroupApprovals(groupApprovals, autoApproval);

        if (userApprovalDefs && Object.keys(userApprovalDefs).length === 0 && groupApprovalDefs && Object.keys(groupApprovalDefs).length === 0) {
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[onExecute] No Approvals were generated. Applying default behaviour and skipping this Change Approval Policy");
            this._defaultSkip(this._activity, this._gr, false, this._gs.getMessage("No approvals were generated from matched Decisions. {0} has been skipped ({1}).", [chgPolAppGR.getDisplayValue(), this._activity.activity.name.toString()]));
            return;
        }

        // Save the list of Change Approvals that have been generated
        this._activity.scratchpad.user_approvals = userApprovalDefs;
        this._activity.scratchpad.group_approvals = groupApprovalDefs;
        this._activity.state = this.WAITING;

        // Check if the activity should finish
        this._onUpdate();
    },

    onDetermineApprovalState: function() {
        if (this.log.atLevel(GSLog.DEBUG))
            this.log.debug("[onDetermineApprovalState] Checking approval state");
        this._onUpdate();
    },

    // The task has changed, see if we need to update our approval state
    onUpdate: function() {
        if (this.log.atLevel(GSLog.DEBUG))
            this.log.debug("[onUpdate] Checking approval state");

        // Evaluate the finish_condition, if true set the state and result to finished.
        if (this._finishActivity())
            return;

        this._onUpdate();
    },

    onCancel: function() {
        if (this.log.atLevel(GSLog.DEBUG))
            this.log.debug("[onCancel] Cancelling Change Approval Policy activity");
        var changeSysId = this._gr.getUniqueValue();
        this._setPendingUserApprovalsByIds("", changeSysId, this.CANCELLED);
        this._setPendingGroupApprovalsByIds("", changeSysId, this.CANCELLED);
        this._activity.state = this.CANCELLED;
        this._activity.result = this.CANCELLED;
    },

    logChgPolApplied: function(chgReqId, chgPolId, decQueId, decAnsId) {
        if (this.log.atLevel(GSLog.DEBUG))
            this.log.debug("[logChgPolApplied] Log for Change: " + chgReqId + ", Policy: " + chgPolId + ", Question: " + decQueId + ", Answer: " + decAnsId);
        var chgPolAppGR = new GlideRecord("chg_policy_applied");
        chgPolAppGR.setValue("change_request", chgReqId);
        chgPolAppGR.setValue("chg_policy", chgPolId);
        chgPolAppGR.setValue("sys_decision_question", decQueId);
        chgPolAppGR.setValue("chg_policy_action", decAnsId);
        chgPolAppGR.setValue("activity_name", this._activity.activity.name.toString());
        return chgPolAppGR.insert();
    },

    // override this to provide the proper stage state
    getFinalStageState: function() {
        return new WFApprovalStages().getApprovalState(this._gr, this._gr.stage, this._activity);
    },

    _onUpdate: function() {
        var state = this._determineOverallState();
        if (state && (state !== this.REQUESTED)) {
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[_onUpdate] State has changed to " + state + ". Marking remaining approvals as no longer required");

            // Set all pending approvals to not required.
            this.approvalUtils.setPendingUserApprovalsByIds(Object.keys(this._activity.scratchpad.user_approvals), this.NOT_REQUIRED);
            this.approvalUtils.setPendingGroupApprovalsByIds(Object.keys(this._activity.scratchpad.group_approvals), this.NOT_REQUIRED);

            var chgPolAppGR = this._activity.vars.approval_policy.getRefRecord();
            if (chgPolAppGR.isValidRecord()) {
                var comment = "";
                if (state === this.APPROVED)
                    comment = this._gs.getMessage("Change Request has been approved by {0} ({1}).", [chgPolAppGR.getDisplayValue(), this._activity.activity.name.toString()]);
                else if (state === this.REJECTED)
                    comment = this._gs.getMessage("Change Request has been rejected by {0} ({1}).", [chgPolAppGR.getDisplayValue(), this._activity.activity.name.toString()]);
                if (comment)
                    this.approvalUtils.addApprovalHistoryGR(this._gr, comment);
            }
            this._activity.state = this.FINISHED;
            this._activity.result = state;
        } else if ((state === this.REQUESTED) && (this._activity.result !== state)) {
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[_onUpdate] Activity is in the waiting state as approvals are requested");
            // changed back to requested state (unapprove can do this)
            this._activity.state = this.WAITING;
            this._activity.result = "";
        }
    },

    // Determine the overall state of the approvals (approved, rejected or "")
    _determineOverallState: function() {
        var userState = this._determineUserApprovalState();
        var groupState = this._refreshGroupApprovals();

        if (this.log.atLevel(GSLog.DEBUG))
            this.log.debug("[_determineOverallState] userState: " + userState + ", groupState: " + groupState);

        if (this.REJECTED === userState || this.REJECTED === groupState)
            return this.REJECTED;
        else if (this.MANDATORY === userState || this.MANDATORY === groupState)
            return this.REQUESTED;
        else if (this.APPROVED === userState || this.APPROVED === groupState)
            return this.APPROVED;
        else if (this.SKIPPED === userState || this.SKIPPED === groupState)
            return this.SKIPPED;
        else if (userState === groupState)
            return userState;
        else
            return this.REQUESTED;
    },

    // Refreshes the overall state of group approvals
    _refreshGroupApprovals: function() {
        var groupApprovalDefs = this._activity.scratchpad.group_approvals;
        var groupApprovalIds = Object.keys(groupApprovalDefs);

        var appGroupGR = new GlideRecord("sysapproval_group");
        appGroupGR.addQuery("sys_id", groupApprovalIds);
        appGroupGR.query();

        if (!appGroupGR.hasNext())
            return this.NOT_REQUIRED;

        // Identify individual group approval states
        var rejectedChange = false;
        var haveApproval = false;
        while (appGroupGR.next()) {
            var approvalId = appGroupGR.getUniqueValue();

            var currentState = this._refreshGroupApprovalState(appGroupGR, groupApprovalDefs[approvalId].wait_for, groupApprovalDefs[approvalId].percentage);
            groupApprovalDefs[approvalId].approval_state = currentState;

            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[_refreshGroupApprovals] Group approval: " + appGroupGR.getValue("number") + "|" + approvalId +
                    ", state: " + currentState +
                    ", mandatory: " + groupApprovalDefs[approvalId].mandatory);

            // Hard reject.  If any group rejects, it's out of here.  We need to make all other groups no longer required after this point.
            if (currentState === this.REJECTED)
                rejectedChange = true;

            // A group has approved but we have to parse everything to determine the change is approved.
            if (currentState === this.APPROVED)
                haveApproval = true;
        }

        // Now we have determined the individual group approval states so we can decide on what to do overall
        var approvalRequired = false;
        var mandatoryApproval = false;
        for (var i = 0; i < groupApprovalIds.length; i++) {
            var gaId = groupApprovalIds[i];

            if (groupApprovalDefs[gaId].approval_state === this.REQUESTED) {
                if (rejectedChange || (haveApproval && groupApprovalDefs[gaId].mandatory !== "true")) {
                    this.approvalUtils.setPendingGroupApprovalsByIds(gaId, this.NOT_REQUIRED);
                    groupApprovalDefs[gaId].approval_state = this.NOT_REQUIRED;
                    return;
                }

                //If we're still waiting for a mandatory approval, haveApproval is false
                if (groupApprovalDefs[gaId].mandatory === "true") {
                    haveApproval = false;
                    mandatoryApproval = true;
                }

                // If we have a requested group approval which has made it this far, approval is required
                approvalRequired = true;
            }
        }

        if (this.log.atLevel(GSLog.DEBUG))
            this.log.debug("[_refreshGroupApprovals] State:\n" + JSON.stringify(groupApprovalDefs, null, 3) + "\n[/_refrehGroupApprovals]");

        // If the change has been rejected
        if (rejectedChange)
            return this.REJECTED;

        // If we already have approval
        if (haveApproval)
            return this.APPROVED;

        // If approval is not required
        if (!approvalRequired)
            return this.NOT_REQUIRED;

        // If we are waiting for a mandatory approval
        if (mandatoryApproval)
            return this.MANDATORY;

        //Otherwise it's requested
        return this.REQUESTED;
    },

    // Determine approved/rejected states for the given approvals within a group and update state if required.
    _refreshGroupApprovalState: function(appGroupGR, waitFor, percentageRequired) {
        function updateGroupState(state, user) {
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[_refreshGroupApprovalState] Updating Group approval : " + appGroupGR.getValue("number") + "|" + appGroupGR.getUniqueValue() +
                    ", prevState: " + appGroupGR.getValue("approval") +
                    ", newState: " + state);

            appGroupGR.setValue("approval", state);
            if (state !== this.REQUESTED && user)
                appGroupGR.setValue("approval_user", user);
            else
                appGroupGR.setValue("approval_user", "");

            if (!appGroupGR.update())
                return null;

            //Approval History Messaging
            var commentParams = [appGroupGR.assignment_group.getDisplayValue(),
                user ? this.approvalUtils.getUserName(user) : "",
                this._activity.activity.name.toString()
            ];

            if (state === this.APPROVED)
                this.approvalUtils.addApprovalHistoryGR(this._gr, user ?
                    this._gs.getMessage("Group approval for {0} approved by user {1} ({2}).", commentParams) :
                    this._gs.getMessage("Group approval for {0} approved by all users ({2}).", commentParams));

            if (state === this.REJECTED)
                this.approvalUtils.addApprovalHistoryGR(this._gr, user ?
                    this._gs.getMessage("Group approval for {0} rejected by user {1} ({2}).", commentParams) :
                    this._gs.getMessage("Group approval for {0} rejected by all users ({2}).", commentParams));

            return state;
        }

        var currentState = appGroupGR.getValue("approval");

        // Unless the currentState is requested we don't need to do anything.
        // We just return duplicate, cancelled, not_requested, not_required, approved, rejected
        if (currentState !== this.REQUESTED)
            return currentState;

        var ret = this.approvalUtils.getUserGroupApprovalCounts(appGroupGR.getUniqueValue());
        //Compensate for unneeded approval records.
        ret.counts["total"] -= ret.counts[this.NOT_REQUIRED];
        ret.counts['total'] -= ret.counts[this.DUPLICATE];
        ret.counts["total"] -= ret.counts[this.CANCELLED];

        // No valid approvals
        if (ret.counts["total"] === 0) {
            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[_refreshGroupApprovalState] Group approval: " + appGroupGR.getValue("number") + "|" + appGroupGR.getUniqueValue() +
                    ", state: " + currentState +
                    ", member approvals are not_required, duplicate or cancelled");
            return currentState;
        }

        // Hard rejection
        if (ret.counts[this.REJECTED] > 0)
            return updateGroupState(this.REJECTED, ret.approvalIDs[this.REJECTED][0]);

        // Percentage of users approval
        if (waitFor === "percent" && this._percentageApproved(ret.counts, percentageRequired))
            return updateGroupState(this.APPROVED);

        // First in group approval
        var percentageFirstResponse = (waitFor === "percent" && (!percentageRequired || percentageRequired <= 0));
        if ((waitFor === "first" || percentageFirstResponse) && ret.counts[this.APPROVED] > 0) {
            if (updateGroupState(this.APPROVED, ret.approvalIDs[this.APPROVED][0]))
                this.approvalUtils.setPendingGroupApprovalsByIds(appGroupGR.getUniqueValue(), this.NOT_REQUIRED);
            return this.APPROVED;
        }

        // All in group approval
        var percentageAllResponse = (waitFor === "percent" && percentageRequired && percentageRequired >= 100);
        if ((waitFor === "all" || percentageAllResponse) && ret.counts[this.APPROVED] === ret.counts["total"])
            return updateGroupState(this.APPROVED);

        return currentState; // No state change if none of the above are fulfilled
    },

    _percentageApproved: function(approvalCounts, percentageRequired) {
        // Delegate to first response check
        if (!percentageRequired || percentageRequired <= 0)
            return false;

        // Delegate to all response check
        if (percentageRequired >= 100)
            return false;

        var total = parseInt(approvalCounts["total"]);
        var approved = parseInt(approvalCounts[this.APPROVED]);
        var calculatedPercentage = (approved / total) * 100;
        if (calculatedPercentage < percentageRequired)
            return false;

        return true;
    },

    _determineUserApprovalState: function() {
        var state = this.REQUESTED;
        var userApprovalDefs = this._activity.scratchpad.user_approvals;
        var userApprovalIds = Object.keys(userApprovalDefs);
        var userApprovalGR = new GlideRecord("sysapproval_approver");
        var mandatory = false;
        userApprovalGR.addQuery("sys_id", userApprovalIds);
        userApprovalGR.query();
        while (userApprovalGR.next()) {
            var approvalId = userApprovalGR.getUniqueValue();
            userApprovalDefs[approvalId].approval_state = userApprovalGR.getValue("state");

            if (this.log.atLevel(GSLog.DEBUG))
                this.log.debug("[_determineUserApprovalState] User approval: " + approvalId +
                    ", state: " + userApprovalDefs[approvalId].approval_state +
                    ", mandatory: " + userApprovalDefs[approvalId].mandatory);

            if (this.REJECTED === userApprovalDefs[approvalId].approval_state) {
                state = this.REJECTED;
                break;
            } else if (this.APPROVED === userApprovalDefs[approvalId].approval_state)
                state = this.APPROVED;
            else if (this.SKIPPED === userApprovalDefs[approvalId].approval_state)
                state = this.SKIPPED;
            else if ("true" === userApprovalDefs[approvalId].mandatory && this.REQUESTED === userApprovalDefs[approvalId].approval_state)
                mandatory = true;
        }

        if (mandatory && state !== this.REJECTED)
            state = this.MANDATORY;

        return state;
    },

    _createUserApprovals: function(userApprovals, autoApproval) {
        var userApprovalDefs = {};

        var existingIds = this._getExistingUserApprovals();
        for (var i = 0; i < userApprovals.length; i++) {
            var state = this.REQUESTED;
            var approvalId = "";

            // If there is an auto-approval and this is not a mandatory approval, ensure state is set to NOT_REQUIRED
            if (autoApproval && "true" !== userApprovals[i].mandatory)
                state = this.NOT_REQUIRED;

            // Auto-approval state is known
            if (this.autoApprovalType[userApprovals[i].approval_action])
                state = this.autoApprovalType[userApprovals[i].approval_action];

            if (existingIds && existingIds[userApprovals[i].target_id]) {
                if (this.log.atLevel(GSLog.DEBUG))
                    this.log.debug("[_createUserApprovals] Found an existing approval for user: " + userApprovals[i].target_id);

                approvalId = existingIds[userApprovals[i].target_id];
                this._setApprovalState(approvalId, state, this.SYSAPPROVAL_APPROVER);
            } else {
                if (this.log.atLevel(GSLog.DEBUG))
                    this.log.debug("[_createUserApprovals] Create a new approval for user: " + userApprovals[i].target_id + ", state: " + state);

                approvalId = this._createNewUserApproval(userApprovals[i].target_id, state);
            }
            if (approvalId) {
                userApprovals[i].approval_state = state;
                userApprovals[i].sysapproval_approver = approvalId;
                userApprovalDefs[approvalId] = userApprovals[i];
            }
        }

        return userApprovalDefs;
    },

    _createNewUserApproval: function(userId, state, approvalOrder) {
        var userAppGR = new GlideRecord("sysapproval_approver");
        userAppGR.initialize();
        // When auto approving/rejecting an approval need to ensure unnecessary update events to the workflow do not occur
        if (this.APPROVED === state || this.REJECTED === state)
            userAppGR.setWorkflow(false);
        var table = this._gr.getRecordClassName();
        var guid = this._gr.getUniqueValue();
        if (table != null && this.approvalUtils.isTask(table)) {
            userAppGR.sysapproval = this._gr.sys_id;
            userAppGR.sysapproval.setRefRecord(this._gr);
        }
        userAppGR.document_id = guid;
        userAppGR.document_id.setRefRecord(this._gr);
        userAppGR.source_table = table;
        userAppGR.approver = userId;
        var approvalColumn = this._activity.vars.approval_column;
        userAppGR.approval_column = approvalColumn ? this.js(approvalColumn) : "approval";
        var approvalHistory = this._activity.vars.approval_history;
        userAppGR.approval_journal_column = approvalHistory ? this.js(approvalHistory) : "approval_history";
        userAppGR.wf_activity = this._activity.activity.sys_id;
        userAppGR.state = state;
        if (approvalOrder)
            userAppGR.order = approvalOrder;
        userAppGR.expected_start.setValue(this.expected_start);
        userAppGR.due_date.setValue(this.due_date);

        return userAppGR.insert();
    },

    _getExistingUserApprovals: function() {
        var ids = {};

        var gr = new GlideRecord("sysapproval_approver");
        gr.initialize();
        // We work with the change_request table only, so we can depend on sysapproval field.
        gr.addQuery("sysapproval", this._gr.sys_id);
        gr.addQuery("wf_activity", this._activity.activity.sys_id);
        gr.addQuery("state", "!=", this.CANCELLED);
        gr.addNullQuery("group");
        gr.query();
        while (gr.next())
            ids[gr.approver.toString()] = gr.sys_id.toString();

        return ids;
    },

    _createGroupApprovals: function(groupApprovals, autoApproval) {
        var groupApprovalDefs = {};

        // Avoid recreating approvals for group members that already have them from this activity
        var existingIds = this._getExistingGroupApprovals();

        // Avoid creating more than one group approval for the same group
        var createdGroupApprovals = {};
        for (var i = 0; i < groupApprovals.length; i++) {
            var state = this.REQUESTED;
            var groupAppGR = null;
            var approvalId = "";

            // If there is an auto-approval and this is not a mandatory approval, ensure state is set to NOT_REQUIRED
            if (autoApproval && "true" !== groupApprovals[i].mandatory)
                state = this.NOT_REQUIRED;

            if (existingIds && existingIds[groupApprovals[i].target_id]) {
                if (this.log.atLevel(GSLog.DEBUG))
                    this.log.debug("[_createUserApprovals] Found an existing approval for group: " + groupApprovals[i].target_id);

                approvalId = existingIds[groupApprovals[i].target_id];
                this._setApprovalState(approvalId, state, this.SYSAPPROVAL_GROUP);
            } else {
                // Check if we've already created an approval for this group
                if (createdGroupApprovals[groupApprovals[i].target_id])
                    continue;

                groupAppGR = this._createNewGroupApproval(groupApprovals[i].target_id, state);
                if (!groupAppGR)
                    continue;
                // Flag that we have created an approval for the group
                createdGroupApprovals[groupApprovals[i].target_id] = true;

                // Create associated user approvals because the SNC - Create user approvals for group
                // business rule does not run when the state is No longer required; auto-approval scenario.
                if (this.NOT_REQUIRED === state)
                    this.approvalUtils.createUserApprovals(groupAppGR);
                approvalId = groupAppGR.getUniqueValue();
            }
            if (approvalId) {
                groupApprovals[i].approval_state = state;
                groupApprovals[i].sysapproval_group = approvalId;
                groupApprovalDefs[approvalId] = groupApprovals[i];
            }
        }

        return groupApprovalDefs;
    },

    _createNewGroupApproval: function(groupId, state, approvalOrder) {
        // make sure there are users of the group before creating it
        var ids = this.approvalUtils.getMembersOfGroup(groupId);
        if (ids.length == 0)
            return "";

        var groupAppGR = new GlideRecord("sysapproval_group");
        groupAppGR.assignment_group = groupId;
        groupAppGR.parent = this._gr.sys_id;
        groupAppGR.parent.setRefRecord(this._gr);
        groupAppGR.wf_activity = this._activity.activity.sys_id;
        groupAppGR.approval = state;
        if (this.NOT_REQUIRED === state)
            groupAppGR.setWorkflow(false);
        if (approvalOrder)
            groupAppGR.order = approvalOrder;
        groupAppGR.expected_start.setValue(this.expected_start);
        groupAppGR.due_date.setValue(this.due_date);

        if (!groupAppGR.insert())
            return null;

        if (this.log.atLevel(GSLog.DEBUG))
            this.log.debug("[_createNewGroupApproval] Created Group Approval: " + groupAppGR.getValue("number") + "|" + groupAppGR.getUniqueValue() +
                ", Change: " + this._gr.getValue("number") + "|" + this._gr.getUniqueValue() +
                ", Group: " + groupAppGR.assignment_group.getRefRecord().getDisplayValue() + "|" + groupId +
                ", State: " + state +
                ", Workflow Activity: " + groupAppGR.getValue("wf_activity"));

        return groupAppGR;
    },

    _getExistingGroupApprovals: function() {
        var ids = {};
        var groupAppGR = new GlideRecord("sysapproval_group");
        groupAppGR.initialize();
        groupAppGR.addQuery("parent", this._gr.sys_id);
        groupAppGR.addQuery("wf_activity", this._activity.activity.sys_id);
        groupAppGR.addQuery("approval", "!=", this.CANCELLED);
        groupAppGR.query();
        while (groupAppGR.next())
            ids[groupAppGR.assignment_group.toString()] = groupAppGR.sys_id.toString();

        return ids;
    },

    /**
     * Set the state of the approval to the specified state
     */
    _setApprovalState: function(approvalId, state, table) {
        if (this._workflow.scratchpad.maintainStateFlag == true)
            return;

        var appGR = new GlideRecord(table);
        if (!appGR.get(approvalId))
            return;

        appGR.setValue(this.SYSAPPROVAL_GROUP === appGR.getRecordClassName() ? "approval" : "state", state);
        if (this.setDatesFlag) {
            appGR.expected_start.setValue(this.expected_start);
            appGR.due_date.setValue(this.due_date);
        }
        appGR.update();
    },

    _setDueDate: function(startAt) {
        this.expected_start = new GlideDateTime();
        if (startAt)
            this.expected_start.setValue(startAt);

        var wd = new WorkflowDuration();
        wd.setActivity(this);
        wd.setStartDateTime(startAt);
        wd.setWorkflow(this._context.schedule, this._context.timezone);
        wd.calculate(this._activity.vars.__var_record__);
        this.due_date = new GlideDateTime(wd.getEndDateTime());
        this.duration = wd.getTotalSeconds() * 1000;
    },

    _setPendingUserApprovalsByIds: function(approvalSysIds, changeSysId, state) {
        var gr = new GlideRecord("sysapproval_approver");
        if (approvalSysIds)
            gr.addQuery("sys_id", approvalSysIds);
        gr.addQuery("sysapproval", changeSysId);
        gr.addQuery("document_id", changeSysId);
        gr.addQuery("wf_activity", this._activity.activity.sys_id + "");
        gr.addQuery("state", this.pendingStates);
        gr.setValue("state", state);
        gr.updateMultiple();
    },

    _setPendingGroupApprovalsByIds: function(approvalSysIds, changeSysId, state) {
        var gr = new GlideRecord("sysapproval_group");
        if (approvalSysIds)
            gr.addQuery("sys_id", approvalSysIds);
        gr.addQuery("parent", changeSysId);
        gr.addQuery("wf_activity", this._activity.activity.sys_id + "");
        gr.addQuery("approval", this.pendingStates);
        gr.setValue("approval", state);
        gr.updateMultiple();
    },

    _defaultSkip: function(providedActivity, gr, logchgPolApplied, message) {
        providedActivity.state = this.FINISHED;
        providedActivity.result = this.SKIPPED;
        if (logchgPolApplied)
            this.logChgPolApplied(gr.getUniqueValue(), providedActivity.vars.approval_policy, "", "");
        this.approvalUtils.addApprovalHistoryGR(gr, message);
    },

    _defaultReject: function(providedActivity, gr, message) {
        providedActivity.state = this.FINISHED;
        providedActivity.result = this.REJECTED;
        this.approvalUtils.addApprovalHistoryGR(gr, message);
    },

    _finishActivity: function() {
        var condition = "" + this._activity.vars.finish_condition;
        if (!condition)
            return false;

        // Provide change_request, finish_condition, matchAll, caseSensitive
        var stop = SNC.Filter.checkRecord(this._gr, condition, true, false);
        if (stop) {
            this._activity.state = this.FINISHED;
            this._activity.result = this.FINISHED;
        }

        return stop;
    },

    type: 'ChangePolicyApprovalActivitySNC'
});
```
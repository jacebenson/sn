---
title: "todoUtils"
id: "todoutils"
---

API Name: sn_me_todos.todoUtils

```js
var todoUtils = Class.create();

todoUtils.getMyApprovals = function() {
    var u = gs.getUserID();
    var answer = new Array();
    var i = 0;
    answer[i++] = new String(u);
    var g = new GlideRecord("sys_user_delegate");
    g.addQuery("delegate", u);
    g.addQuery("approvals", "true");
    g.addQuery("starts", "<=", gs.daysAgo(0));
    g.addQuery("ends", ">=", gs.daysAgo(0));
    g.query();
    while (g.next())
        answer[i++] = new String(g.user);

    return answer;
};

todoUtils.getMyApprovalsBasedOnPermissions = function () {
	
var approverGr = new GlideRecord("sysapproval_approver");
var approverSysIds = this.getMyApprovals();
approverGr.addNotNullQuery("sysapproval");
approverGr.addQuery("state", "requested");
approverGr.addQuery("approver", "IN", approverSysIds);
approverGr.query();

var filteredSysIds = [];
while (approverGr.next()) {
  if ((approverGr.sysapproval.sys_class_name == "sc_request" ) || (approverGr.sysapproval.sys_class_name == "sc_req_item" )) {
    if (gs.hasRole("approver_user") || gs.hasRole("business_stakeholder"))
      filteredSysIds.push(approverGr.getValue("sys_id"));
    }
  else
    filteredSysIds.push(approverGr.getValue("sys_id"));
}
return filteredSysIds;
};
```
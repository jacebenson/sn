---
title: "AllowCoverageProposalSwap"
id: "allowcoverageproposalswap"
---

API Name: global.AllowCoverageProposalSwap

```js
var AllowCoverageProposalSwap = Class.create();
AllowCoverageProposalSwap.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    allowAutomaticSwapOfCoverage: function() {
        var rosterSpanPoposalSysId = this.getParameter('sysparm_sys_id');
        var isSwapAllowed = this.getParameter('sysparm_is_swap_allowed');
        var rosterSpanProposalGr = new GlideRecord("roster_schedule_span_proposal");
        var result = this.newItem("result");

        if (!rosterSpanProposalGr.get(rosterSpanPoposalSysId)) {
            result.setAttribute("status", "error");
            return result;
        }
        rosterSpanProposalGr.setValue("auto_swap_coverage", isSwapAllowed + "");
        rosterSpanProposalGr.update();
        result.setAttribute("status", "success");
        return result;
    },



    type: 'AllowCoverageProposalSwap'
});
```
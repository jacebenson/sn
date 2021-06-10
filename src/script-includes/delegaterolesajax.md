---
title: "DelegateRolesAjax"
id: "delegaterolesajax"
---

API Name: global.DelegateRolesAjax

```js
var DelegateRolesAjax = Class.create();

DelegateRolesAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    ajaxFunction_getDelegateUserRoles: function() {
       var roles = new GlideRecord('sys_user_has_role');
       roles.addQuery('user', this.getParameter('sysparm_user'));
       roles.addQuery('granted_by', this.getParameter('sysparm_group'));
       roles.query();
       var answer = "";
       while (roles.next() && roles.canRead()) {
           if (answer != "")
               answer += ","
           answer += roles.role;
       }

       return answer;
    }

});
```
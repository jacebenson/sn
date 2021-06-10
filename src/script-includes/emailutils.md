---
title: "EmailUtils"
id: "emailutils"
---

API Name: global.EmailUtils

```js
var EmailUtils = Class.create();
EmailUtils.prototype = {
    initialize: function() {
    },

    containsCalendarInvite: function(/* com.glide.notification.Email */ email) {
        // Cheap way of parsing for VCAL attachment: look for BEGIN:VCALENDAR followed by END:VCALENDAR
        var vCalBeginIndex_text = email.body_text.toLowerCase().indexOf('begin:vcalendar');
        var vCalEndIndex_text = email.body_text.toLowerCase().indexOf('end:vcalendar');
        if (vCalBeginIndex_text > -1 && vCalEndIndex_text > vCalBeginIndex_text)
            return true;
        else
            return false;
    },

    type: 'EmailUtils'
}
```
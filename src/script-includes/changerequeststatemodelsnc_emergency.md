---
title: "ChangeRequestStateModelSNC_emergency"
id: "changerequeststatemodelsnc_emergency"
---

API Name: global.ChangeRequestStateModelSNC_emergency

```js
var ChangeRequestStateModelSNC_emergency = Class.create();
ChangeRequestStateModelSNC_emergency.prototype = {
    initialize: function(changeRequestGr) {
        this._gr = changeRequestGr;
    },

    toDraft_moving: function() {
        return true;
    },

    toDraft_canMove: function() {
        return true;
    },

    toAuthorize_moving: function() {
        return true;
    },

    toAuthorize_canMove: function() {
        return true;
    },

    toScheduled_moving: function() {
        return true;
    },

    toScheduled_canMove: function() {
        return true;
    },

    toImplement_moving: function() {
        if (this._gr.work_start.nil())
            this._gr.work_start = new GlideDateTime();

        return true;
    },

    toImplement_canMove: function() {
        return true;
    },

    toReview_moving: function() {
        if (this._gr.work_end.nil())
            this._gr.work_end = new GlideDateTime();

        //Setting the Actual work start to when change opened because
        //the Change is unauthorized and work has already been done.
        if (this._gr.work_start.nil() && this._gr.unauthorized)
            this._gr.work_start = this._gr.opened_at;

        return true;
    },

    toReview_canMove: function() {
        return true;
    },

    toClosed_moving: function() {
        return true;
    },

    toClosed_canMove: function() {
        return true;
    },

    toCanceled_moving: function() {
        this._gr.on_hold = false;
        return true;
    },

    toCanceled_canMove: function() {
        return true;
    },

    isOnHold: function() {
        return this._gr.on_hold;
    },

    type: 'ChangeRequestStateModelSNC_emergency'
};

```
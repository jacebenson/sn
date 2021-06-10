---
id: spmodal
title: spModal
---
spModal provides an alternative way to show alerts, prompts, and confirmation dialogs. Additionally you can use spModal.open() to display a widget in a modal dialog. spModal is a lightweight wrapper for angular UI bootstrap's $uibModal. See here for more info: https://angular-ui.github.io/bootstrap/#/modal

| Method | Description |
| :------ | :----------- |
| alert (message).then(fn) | Alert a message. The promise contains a single argument that returns true/false. |
| confirm (message).then(fn) | Display a confirmation message. The promise contains a boolean of the user's response.  |
| prompt (message, *defaultValue*).then(fn) | Prompt the user for input. Provide a message and an optional default value for the input field. The promise contains the user's response as a string. |
| open (object options).then(fn) | Open a modal with a customized set of options. See the options table below. |

**Options** object definition

| Option | type | Default | Description |
| :------ | :------ | :------ | :----------- |
| title | string | empty | goes in header - can be HTML | 
| message | string | empty | goes in the body - can be HTML |
| buttons | array | Cancel & OK | buttons to show on the dialog |
| input | bool | false | if true, shows an input field on the dialog |
| value | string | empty | The value of the input field |
| widget | string | empty | The Widget Id or sys_id to embed in the modal |
| widgetInput | object | null | An object to send to the embedded widget as input |
| shared | object | null | A client-side object to share data with the embedded widget client script |
| size | string | empty | 'sm' or 'lg' |

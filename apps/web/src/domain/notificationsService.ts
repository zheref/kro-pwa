interface INotificationManager {
    requestPermission: () => Promise<NotificationPermission>;
    permission: NotificationPermission;
}

interface INotification {
    title: string;
    img: string | undefined;
    body: string | undefined;
}

function getNotificationManager(): INotificationManager | null {
    if (!("Notification" in window)) {
        console.log("This browser does not support notifications.");
        return null;
    }

    return window.Notification as INotificationManager;
}

/**
 * Requests permission to send notifications to the user.
 *
 * @param {Function} callback - A callback function that will be executed once the permission request is resolved.
 * @return {void} This method does not return a value.
 */
function requestNotificationsPermission(callback: (r: NotificationPermission) => void) {
    const manager = getNotificationManager();

    console.log("Requesting notifications permission...");
    manager?.requestPermission().then((result) => {
        callback(result);
    }).catch((err) => {
        console.error("Error while requesting permission", err);
    })
}

/**
 * Checks whether the notifications permission has been requested by the application.
 *
 * This function determines if the notifications permission is in its default state,
 * indicating that the user has not yet been prompted to allow or deny notifications.
 *
 * @return {boolean} Returns true if the notifications permission has not been requested, otherwise false.
 */
function hasNotificationsPermissionBeenRequested(): boolean {
    const permissionVal = getNotificationManager()?.permission;
    console.log("Permissions value has been found to be:", permissionVal);
    return permissionVal !== "default";
}

/**
 * Checks if the notifications permission has been granted by the user.
 *
 * @return {boolean} Returns true if the notifications permission is granted, otherwise false.
 */
function isNotificationsPermissionGranted(): boolean {
    return getNotificationManager()?.permission === "granted";
}

/**
 * Posts a notification using the Notification API.
 *
 * @param {INotification} _ - The notification object containing the title, body, and image to be displayed.
 * @return {Notification} The created Notification instance.
 */
function postNotification(_: INotification): Notification {
    const options: NotificationOptions = {
        body: _.body,
        icon: _.img,
    };
    return new Notification(_.title, options);
}

export type { INotification, INotificationManager };
export {
    hasNotificationsPermissionBeenRequested,
    isNotificationsPermissionGranted,
    postNotification,
    requestNotificationsPermission
};
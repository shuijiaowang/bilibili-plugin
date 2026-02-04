import {defineContentScript, storage} from "#imports";
export default defineContentScript({
    matches: ['*://*/*'],
    main: async () => {
        // setInterval(async () => {
        //         const currentValue = await storage.getItem('local:counter');
        //         console.log('Counter value in content script:', currentValue);
        // },1000)
    },
});

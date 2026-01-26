import {defineBackground, storage} from "#imports";

const counter = storage.defineItem('local:counter', {
    fallback: 0,
});
export default defineBackground( async () => {
    const currentValue = await counter.getValue();
    await storage.setItem('local:counter', currentValue + 1)
    // await counter.setValue(currentValue + 1);
    console.log('Background script started, counter incremented.');
});

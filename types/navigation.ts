export type RootStackParamList = {
    Home: undefined;
    Config: undefined;
    Debug: undefined;
    Snake: undefined;
    Loading: {
        nextScreen: keyof RootStackParamList;
        nextParams?: any;
    };
};
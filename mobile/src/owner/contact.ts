import { Linking } from "react-native";

/** 03001234567 -> 923001234567 for wa.me links. */
const intl = (phone: string) => (phone.startsWith("0") ? `92${phone.slice(1)}` : phone.replace(/^\+/, ""));

export const callPlayer = (phone: string) => Linking.openURL(`tel:${phone}`);
export const whatsappPlayer = (phone: string, message?: string) =>
  Linking.openURL(`https://wa.me/${intl(phone)}${message ? `?text=${encodeURIComponent(message)}` : ""}`);

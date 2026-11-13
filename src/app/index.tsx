import { Redirect } from 'expo-router';

export default function Index() {
  // On redirige simplement vers l'onglet principal (la boutique)
  return <Redirect href="/(tabs)" />;
}
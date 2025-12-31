/**
 * Exemple d'utilisation du système de comptage
 * 
 * Cet exemple montre comment le système fonctionne
 */

// 1. Configuration initiale
// L'admin exécute: /count channel #comptage

// La base de données stocke:
// {
//   guild_id: "123456789",
//   channel_id: "987654321",
//   current_count: 0,
//   last_user_id: null,
//   created_at: "2025-01-01T00:00:00.000Z",
//   updated_at: "2025-01-01T00:00:00.000Z"
// }

// 2. Utilisateur A envoie "1" dans #comptage
// - Le système vérifie: nombre === 1 ✓, last_user_id === null ✓
// - Mise à jour: current_count = 1, last_user_id = "userA_id"
// - Réaction: ✅

// 3. Utilisateur B envoie "2" dans #comptage
// - Le système vérifie: nombre === 2 ✓, last_user_id !== "userB_id" ✓
// - Mise à jour: current_count = 2, last_user_id = "userB_id"
// - Réaction: ✅

// 4. Utilisateur A envoie "3" dans #comptage
// - Le système vérifie: nombre === 3 ✓, last_user_id !== "userA_id" ✓
// - Mise à jour: current_count = 3, last_user_id = "userA_id"
// - Réaction: ✅

// 5. Utilisateur B envoie "4" dans #comptage
// - Le système vérifie: nombre === 4 ✓, last_user_id !== "userB_id" ✓
// - Mise à jour: current_count = 4, last_user_id = "userB_id"
// - Réaction: ✅
// - Message de jalon: 🎉 Jalons! Nous avons atteint 4!

// ... et ainsi de suite

// Exemple d'erreur 1: Mauvais nombre
// Utilisateur C envoie "100" dans #comptage (au lieu de 5)
// - Le système vérifie: nombre === 5? Non, c'est 100
// - Action: Message supprimé, message d'erreur affiché pendant 3s
// - Erreur affichée: "❌ Le nombre attendu était 5, pas 100!"

// Exemple d'erreur 2: Double comptage
// Utilisateur A envoie "5" après avoir envoyé "4"
// - Le système vérifie: last_user_id === "userA_id"? Oui!
// - Action: Message supprimé, message d'erreur affiché pendant 3s
// - Erreur affichée: "❌ Vous avez déjà compté! Attendez que quelqu'un d'autre compte."

// Pour arrêter le jeu:
// L'admin exécute: /count stop
// - La configuration est supprimée de la base de données
// - Message: "⛔ Comptage arrêté. Le score final était: 42"

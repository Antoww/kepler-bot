#!/usr/bin/env deno run --allow-all

/**
 * Script de test pour le système d'anniversaires
 * Ce script permet de tester les fonctionnalités du système d'anniversaires
 */

import { initDatabase, setBirthday, getBirthday, getBirthdaysForDate, getAllBirthdays, updateBirthdayChannel, getBirthdayChannel } from './database/db.ts';

async function testBirthdaySystem() {
    console.log('🧪 Début des tests du système d\'anniversaires...\n');

    try {
        // Initialiser la base de données
        console.log('📊 Initialisation de la base de données...');
        await initDatabase();
        console.log('✅ Base de données initialisée\n');

        // ID de test (remplacez par vos vrais IDs)
        const testGuildId = '123456789012345678';
        const testUserId = '987654321098765432';
        const testChannelId = '555666777888999000';

        // Test 1: Configuration du canal d'anniversaires
        console.log('🔧 Test 1: Configuration du canal d\'anniversaires');
        await updateBirthdayChannel(testGuildId, testChannelId);
        const retrievedChannelId = await getBirthdayChannel(testGuildId);
        console.log(`Canal configuré: ${retrievedChannelId}`);
        console.log(retrievedChannelId === testChannelId ? '✅ Succès' : '❌ Échec');
        console.log('');

        // Test 2: Ajout d'un anniversaire
        console.log('🎂 Test 2: Ajout d\'un anniversaire');
        await setBirthday(testGuildId, testUserId, 15, 6, 1995);
        const birthday = await getBirthday(testGuildId, testUserId);
        console.log('Anniversaire ajouté:', birthday);
        console.log(birthday !== null ? '✅ Succès' : '❌ Échec');
        console.log('');

        // Test 3: Récupération d'anniversaires pour une date
        console.log('📅 Test 3: Récupération d\'anniversaires pour le 15/6');
        const birthdaysForDate = await getBirthdaysForDate(testGuildId, 15, 6);
        console.log('Anniversaires trouvés:', birthdaysForDate.length);
        console.log(birthdaysForDate.length > 0 ? '✅ Succès' : '❌ Échec');
        console.log('');

        // Test 4: Récupération de tous les anniversaires
        console.log('📋 Test 4: Récupération de tous les anniversaires du serveur');
        const allBirthdays = await getAllBirthdays(testGuildId);
        console.log('Total anniversaires:', allBirthdays.length);
        console.log(allBirthdays.length > 0 ? '✅ Succès' : '❌ Échec');
        console.log('');

        // Test 5: Validation de date
        console.log('✅ Test 5: Validation des dates');
        console.log('Date valide (15/6):', validateDate(15, 6));
        console.log('Date invalide (32/6):', validateDate(32, 6));
        console.log('Date invalide (15/13):', validateDate(15, 13));
        console.log('Date bissextile valide (29/2/2020):', validateDate(29, 2, 2020));
        console.log('Date bissextile invalide (29/2/2021):', validateDate(29, 2, 2021));
        console.log('');

        console.log('🎉 Tous les tests sont terminés !');

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error);
    }
}

function validateDate(day: number, month: number, year?: number): boolean {
    // Vérifier les limites de base
    if (day < 1 || day > 31 || month < 1 || month > 12) {
        return false;
    }

    // Vérifier les jours par mois
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    // Gérer les années bissextiles si l'année est fournie
    if (year && month === 2) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (isLeapYear && day <= 29) return true;
        if (!isLeapYear && day <= 28) return true;
        return false;
    }

    return day <= daysInMonth[month - 1];
}

// Exécuter les tests si le script est appelé directement
if (import.meta.main) {
    await testBirthdaySystem();
}

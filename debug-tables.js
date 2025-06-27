// Table Debug Script
// Add this to check if tables are being populated correctly

(function () {
    // Wait for page load
    setTimeout(function () {
        console.log('=== TABLE DEBUG INFO ===');

        // Check patients table
        const patientsTable = document.querySelector('#patientsTable');
        if (patientsTable) {
            const patientsBody = patientsTable.querySelector('tbody');
            console.log('Patients table found:', patientsTable);
            console.log('Patients tbody found:', patientsBody);
            console.log(
                'Patients rows count:',
                patientsBody ? patientsBody.rows.length : 'N/A'
            );
            console.log(
                'Patients tbody innerHTML length:',
                patientsBody ? patientsBody.innerHTML.length : 'N/A'
            );
            console.log('Patients table style:', patientsTable.style.cssText);
        } else {
            console.log('❌ Patients table not found');
        }

        // Check sessions table
        const sessionsTable = document.querySelector('#sessionsTable');
        if (sessionsTable) {
            const sessionsBody = sessionsTable.querySelector('tbody');
            console.log('Sessions table found:', sessionsTable);
            console.log('Sessions tbody found:', sessionsBody);
            console.log(
                'Sessions rows count:',
                sessionsBody ? sessionsBody.rows.length : 'N/A'
            );
            console.log(
                'Sessions tbody innerHTML length:',
                sessionsBody ? sessionsBody.innerHTML.length : 'N/A'
            );
            console.log('Sessions table style:', sessionsTable.style.cssText);
        } else {
            console.log('❌ Sessions table not found');
        }

        // Check users table
        const usersTable = document.querySelector('#usersTable');
        if (usersTable) {
            const usersBody = usersTable.querySelector('tbody');
            console.log('Users table found:', usersTable);
            console.log('Users tbody found:', usersBody);
            console.log(
                'Users rows count:',
                usersBody ? usersBody.rows.length : 'N/A'
            );
            console.log(
                'Users tbody innerHTML length:',
                usersBody ? usersBody.innerHTML.length : 'N/A'
            );
            console.log('Users table style:', usersTable.style.cssText);
        } else {
            console.log('❌ Users table not found');
        }

        // Check global variables
        console.log('Global allPatients:', window.allPatients || 'undefined');
        console.log('Global allSessions:', window.allSessions || 'undefined');
        console.log('Global allUsers:', window.allUsers || 'undefined');

        console.log('=== END TABLE DEBUG ===');
    }, 3000);
})();

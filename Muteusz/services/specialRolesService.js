const fs = require('fs').promises;
const { createBotLogger } = require('../../utils/consoleLogger');

const logger = createBotLogger('Muteusz');

class SpecialRolesService {
    constructor(config) {
        this.config = config;
        this.specialRolesFile = './Muteusz/data/special_roles.json';
    }

    /**
     * Odczytuje listę ról specjalnych
     * @returns {Array} Lista ID ról specjalnych
     */
    async readSpecialRoles() {
        try {
            const data = await fs.readFile(this.specialRolesFile, 'utf8');
            const parsed = JSON.parse(data);
            return parsed.roles || [];
        } catch (error) {
            // Jeśli plik nie istnieje, zwróć pustą listę
            if (error.code === 'ENOENT') {
                return [];
            }
            logger.error(`Błąd podczas odczytu pliku ról specjalnych: ${error.message}`);
            return [];
        }
    }

    /**
     * Zapisuje listę ról specjalnych
     * @param {Array} roles - Lista ID ról
     */
    async writeSpecialRoles(roles) {
        try {
            // Upewniamy się, że katalog istnieje
            const path = require('path');
            const dir = path.dirname(this.specialRolesFile);
            await fs.mkdir(dir, { recursive: true });
            
            const data = {
                roles: roles,
                lastModified: new Date().toISOString(),
                version: "1.0"
            };
            
            await fs.writeFile(this.specialRolesFile, JSON.stringify(data, null, 2), 'utf8');
            logger.info('Lista ról specjalnych została zapisana');
        } catch (error) {
            logger.error(`Błąd podczas zapisu pliku ról specjalnych: ${error.message}`);
            throw error;
        }
    }

    /**
     * Pobiera pełną listę ról do usunięcia (tylko specjalne)
     * @returns {Array} Lista ID ról specjalnych
     */
    async getAllRolesToRemove() {
        const specialRoles = await this.readSpecialRoles();
        return specialRoles;
    }

    /**
     * Dodaje rolę do listy ról specjalnych
     * @param {string} roleId - ID roli do dodania
     * @returns {Object} Wynik operacji
     */
    async addSpecialRole(roleId) {
        try {
            const currentRoles = await this.readSpecialRoles();
            
            // Sprawdź czy rola już istnieje w specjalnych
            if (currentRoles.includes(roleId)) {
                return {
                    success: false,
                    reason: 'already_exists',
                    message: 'Rola już istnieje na liście ról specjalnych'
                };
            }
            
            // Dodaj rolę
            currentRoles.push(roleId);
            await this.writeSpecialRoles(currentRoles);
            
            logger.info(`Dodano rolę specjalną: ${roleId}`);
            
            return {
                success: true,
                roleId: roleId,
                totalRoles: currentRoles.length
            };
            
        } catch (error) {
            logger.error(`Błąd dodawania roli specjalnej ${roleId}: ${error.message}`);
            return {
                success: false,
                reason: 'error',
                message: error.message
            };
        }
    }

    /**
     * Usuwa rolę z listy ról specjalnych
     * @param {string} roleId - ID roli do usunięcia
     * @returns {Object} Wynik operacji
     */
    async removeSpecialRole(roleId) {
        try {
            const currentRoles = await this.readSpecialRoles();
            
            // Sprawdź czy rola istnieje w specjalnych
            if (!currentRoles.includes(roleId)) {
                return {
                    success: false,
                    reason: 'not_found',
                    message: 'Rola nie znajduje się na liście ról specjalnych'
                };
            }
            
            // Usuń rolę
            const updatedRoles = currentRoles.filter(id => id !== roleId);
            await this.writeSpecialRoles(updatedRoles);
            
            logger.info(`Usunięto rolę specjalną: ${roleId}`);
            
            return {
                success: true,
                roleId: roleId,
                totalRoles: updatedRoles.length
            };
            
        } catch (error) {
            logger.error(`Błąd usuwania roli specjalnej ${roleId}: ${error.message}`);
            return {
                success: false,
                reason: 'error',
                message: error.message
            };
        }
    }

    /**
     * Pobiera informacje o rolach specjalnych
     * @param {Guild} guild - Serwer Discord
     * @returns {Object} Informacje o rolach
     */
    async getSpecialRolesInfo(guild) {
        try {
            const specialRoles = await this.readSpecialRoles();
            
            const roleDetails = {
                specialRoles: [],
                invalidRoles: []
            };
            
            // Sprawdź role specjalne
            for (const roleId of specialRoles) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    roleDetails.specialRoles.push({
                        id: roleId,
                        name: role.name,
                        valid: true
                    });
                } else {
                    roleDetails.invalidRoles.push({
                        id: roleId,
                        source: 'Special',
                        valid: false
                    });
                }
            }
            
            return {
                success: true,
                ...roleDetails,
                totalCount: specialRoles.length,
                validCount: roleDetails.specialRoles.length
            };
            
        } catch (error) {
            logger.error(`Błąd pobierania informacji o rolach specjalnych: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Czyści nieważne role specjalne (które już nie istnieją na serwerze)
     * @param {Guild} guild - Serwer Discord
     * @returns {Object} Wynik operacji
     */
    async cleanupInvalidRoles(guild) {
        try {
            const specialRoles = await this.readSpecialRoles();
            const validRoles = [];
            let removedCount = 0;
            
            for (const roleId of specialRoles) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    validRoles.push(roleId);
                } else {
                    removedCount++;
                    logger.info(`Usunięto nieważną rolę specjalną: ${roleId}`);
                }
            }
            
            if (removedCount > 0) {
                await this.writeSpecialRoles(validRoles);
            }
            
            return {
                success: true,
                removedCount: removedCount,
                remainingCount: validRoles.length
            };
            
        } catch (error) {
            logger.error(`Błąd czyszczenia nieważnych ról: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = SpecialRolesService;
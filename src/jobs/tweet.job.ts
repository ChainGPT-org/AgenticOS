import { schedule } from 'node-cron';
import { readFileSync } from 'fs';
import { join } from 'path';
import { generateAndPostTweet } from '../services/twitter.service';

// Path to the schedule configuration file
const CONFIG_PATH = join(import.meta.dir, '../../data/schedule.json');

/**
 * Load schedule configuration from JSON file
 * @returns The schedule configuration with config and schedule entries
 */
function loadConfig(): { config: any, schedule: Record<string, any> } {
    try {
        const data = readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading schedule config:', error);
        return { config: {}, schedule: {} };
    }
}

/**
 * Process template strings in the instruction
 * @param instruction - The instruction template
 * @param config - The configuration with replacement values
 * @returns The processed instruction
 */
function processTemplate(instruction: string, config: any): string {
    return instruction.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return config[key] || match;
    });
}

/**
 * Schedule tweets based on configuration
 * Sets up cron jobs for each time entry in the schedule
 */
export function scheduleTweets(): void {
    const { config, schedule: scheduleEntries } = loadConfig();

    if (!scheduleEntries || Object.keys(scheduleEntries).length === 0) {
        console.warn('No scheduled tweets found in configuration');
        return;
    }

    console.log(`Setting up ${Object.keys(scheduleEntries).length} scheduled tweets`);

    for (const time in scheduleEntries) {
        const entry = scheduleEntries[time];
        const { type, instruction } = entry;

        // Process the template to replace placeholders with actual values
        const processedInstruction = processTemplate(instruction, config);

        const [hour, minute] = time.split(':');
        const timezone = config.timezone || 'UTC';

        // Schedule the cron job
        schedule(
            `${minute} ${hour} * * *`,
            async () => {
                try {
                    console.log(`Running scheduled tweet for ${timezone} time: ${time} (Type: ${type})`);
                    await generateAndPostTweet(processedInstruction);
                } catch (error) {
                    console.error(`Error executing scheduled tweet for time ${time}:`, error);
                }
            },
            {
                timezone,
            }
        );

        console.log(`Scheduled ${type} tweet for ${time} ${timezone}`);
    }

    console.log('Tweet scheduler started successfully');
} 
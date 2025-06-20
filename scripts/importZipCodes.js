const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config({ path: './server/.env' });
const ZipCode = require('../server/models/ZipCode');

const connectDB = async () => {
    try {
        console.log('🔌 Connecting to MongoDB...');
        console.log('📍 MONGO_URI found:', process.env.MONGO_URI ? 'Yes' : 'No');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB successfully!');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

const debugImportZipCodes = async () => {
    try {
        await connectDB();
        
        // Check CSV file exists
        const csvPath = path.join(__dirname, '../data/uszips.csv');
        console.log('📂 Looking for CSV file at:', csvPath);
        
        if (!fs.existsSync(csvPath)) {
            console.error('❌ CSV file not found at:', csvPath);
            console.log('💡 Please make sure you have:');
            console.log('   1. Downloaded uszips.csv from SimpleMaps');
            console.log('   2. Placed it in the data/ folder');
            return;
        }
        
        console.log('✅ CSV file found!');
        
        // Check file size
        const stats = fs.statSync(csvPath);
        console.log('📊 File size:', Math.round(stats.size / 1024 / 1024 * 100) / 100, 'MB');
        
        // Clear existing ZIP codes
        console.log('🗑️  Clearing existing ZIP codes...');
        const deleteResult = await ZipCode.deleteMany({});
        console.log('🗑️  Deleted:', deleteResult.deletedCount, 'existing records');
        
        const zipCodes = [];
        let rowCount = 0;
        let validCount = 0;
        let invalidCount = 0;
        
        console.log('📖 Reading CSV file...');
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    rowCount++;
                    
                    // Log first few rows to check format
                    if (rowCount <= 3) {
                        console.log(`📋 Row ${rowCount}:`, {
                            zip: row.zip,
                            city: row.city,
                            state_id: row.state_id,
                            lat: row.lat,
                            lng: row.lng
                        });
                    }
                    
                    // Map CSV columns to my schema
                    const zipCode = {
                        zip: row.zip,
                        lat: parseFloat(row.lat),
                        lng: parseFloat(row.lng),
                        city: row.city,
                        state_id: row.state_id,
                        state_name: row.state_name,
                        county_name: row.county_name || '',
                        population: parseInt(row.population) || 0,
                        density: parseFloat(row.density) || 0
                    };
                    
                    // Validation with detailed logging
                    const isValidZip = /^\d{5}$/.test(zipCode.zip);
                    const hasValidLat = !isNaN(zipCode.lat);
                    const hasValidLng = !isNaN(zipCode.lng);
                    const hasCity = zipCode.city && zipCode.city.trim().length > 0;
                    const hasState = zipCode.state_id && zipCode.state_id.trim().length > 0;
                    const inLatRange = zipCode.lat >= 15 && zipCode.lat <= 72;
                    const inLngRange = zipCode.lng >= -180 && zipCode.lng <= -65;
                    
                    if (rowCount <= 5) {
                        console.log(`🔍 Validation for row ${rowCount}:`, {
                            zip: zipCode.zip,
                            isValidZip,
                            hasValidLat,
                            hasValidLng,
                            hasCity,
                            hasState,
                            inLatRange,
                            inLngRange
                        });
                    }
                    
                    if (isValidZip && hasValidLat && hasValidLng && hasCity && hasState && inLatRange && inLngRange) {
                        zipCodes.push(zipCode);
                        validCount++;
                    } else {
                        invalidCount++;
                    }
                    
                    // Progress updates
                    if (rowCount % 5000 === 0) {
                        console.log(`📊 Progress: ${rowCount} rows processed, ${validCount} valid, ${invalidCount} invalid`);
                    }
                })
                .on('end', async () => {
                    try {
                        console.log(`\n📊 CSV Processing Complete:`);
                        console.log(`   Total rows read: ${rowCount}`);
                        console.log(`   Valid ZIP codes: ${validCount}`);
                        console.log(`   Invalid ZIP codes: ${invalidCount}`);
                        console.log(`   Ready to import: ${zipCodes.length}`);
                        
                        if (zipCodes.length === 0) {
                            console.error('❌ No valid ZIP codes to import!');
                            console.log('💡 Check your CSV file format and data');
                            mongoose.connection.close();
                            console.log('🔌 Database connection closed');
                            return;
                        }
                        
                        console.log('💾 Starting database import...');
                        
                        // Batch insert for better performance
                        const batchSize = 1000;
                        let totalImported = 0;
                        
                        for (let i = 0; i < zipCodes.length; i += batchSize) {
                            const batch = zipCodes.slice(i, i + batchSize);
                            try {
                                const result = await ZipCode.insertMany(batch, { ordered: false });
                                totalImported += result.length;
                                console.log(`💾 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(zipCodes.length/batchSize)} imported - Total: ${totalImported}`);
                            } catch (batchError) {
                                console.error('❌ Batch error:', batchError.message);
                                // Continue with other batches
                                if (batchError.writeErrors) {
                                    totalImported += batch.length - batchError.writeErrors.length;
                                }
                            }
                        }
                        
                        // Verify import
                        const finalCount = await ZipCode.countDocuments();
                        
                        console.log(`\n🎉 Import Summary:`);
                        console.log(`   ZIP codes processed: ${zipCodes.length}`);
                        console.log(`   ZIP codes imported: ${totalImported}`);
                        console.log(`   Final database count: ${finalCount}`);
                        
                        if (finalCount > 0) {
                            console.log('✅ Import successful!');
                            
                            // Show some sample data
                            const samples = await ZipCode.find().limit(3);
                            console.log('\n📍 Sample imported data:');
                            samples.forEach(zip => {
                                console.log(`   ${zip.zip} - ${zip.city}, ${zip.state_id}`);
                            });
                        } else {
                            console.log('❌ Import failed - no data in database');
                        }
                        
                        // Close database connection AFTER import completes
                        mongoose.connection.close();
                        console.log('🔌 Database connection closed');
                        resolve();
                    } catch (error) {
                        console.error('❌ Error during import:', error);
                        mongoose.connection.close();
                        console.log('🔌 Database connection closed');
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    console.error('❌ Error reading CSV file:', error);
                    mongoose.connection.close();
                    console.log('🔌 Database connection closed');
                    reject(error);
                });
        });
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }

};

debugImportZipCodes();
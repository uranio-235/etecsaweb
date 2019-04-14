using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace EtecsaWeb.Models
{
    public class EtecsaContext : DbContext
    {
        
        /// <summary>
        /// Representa la tabla que contiene los teléfonos móviles
        /// </summary>
        public DbSet<Movil> Movil { get; set; }

        /// <summary>
        /// Representa la tabla con los teléfonos fijos
        /// </summary>
        public DbSet<Fix> Fix { get; set; }

        /// <summary>
        /// Representa la tabla con la versión de la base de datos, como tipo «Ver»
        /// El obeto instanciado del DbSet sería «new Ver()» para evitar conflictos.
        /// </summary>
        public DbSet<Ver> Version { get; set; }

        /// <summary>
        /// La ruta a la base de datos por si se necesita, así tiene un valor por defecto y otro al vuelo.
        /// </summary>
        public string Fichero { get; set; }

        // incializa la configuración
        protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
        {
            // si el fichero argumentado no existe, toma el del volumen
            if (!System.IO.File.Exists(Fichero)) Fichero = "db/etecsa.db";

            // establece la conexión con la base de datos
            optionsBuilder.UseSqlite($"Data Source={Fichero};");

        } // OnConfiguring

        // devuelve las provincias por su nombre
        public static Dictionary<short, string> Provincias = new Dictionary<short, string>()
                {
                { 5,"(Cell Phone)" },
                { 7,"La Habana" },
                { 43,"Cienfuegos" },
                { 31,"Las Tunas" },
                { 48,"Pinar del Río" },
                { 42,"Villa Clara" },
                { 24,"Holguín" },
                { 47,"Mayabeque/Artemisa" },
                { 41,"Sancti Spíritus"},
                { 23,"Granma" },
                { 46,"La Isla" },
                { 33,"Ciego de Ávila" },
                { 22,"Santiago de Cuba" },
                { 45,"Matanzas" },
                { 32,"Camagüey" },
                { 21,"Guantánamo"}
                };

    } // class


    // la versión
    [Table("version")]
    public class Ver
    {
        [Key]
        public string Version { get; set; }
    }


    // los números móviles
    [Table("movil")]
    public class Movil
    {
        // los campos
        [Key]
        public string Number { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public string Identification { get; set; }
        public int Province { get; set; }

        /// <summary>
        /// Devuelve la Provincia como nombre según el prefijo telefónico, por ejemplo «La Habana».
        /// Los móviles no tienen provincia, todos dicen ser de la habana, Identification si empieza con "(" es un móvil.
        /// </summary>
        public string Provincia => Identification.StartsWith('(') ? EtecsaContext.Provincias[(short)Province] : "(teléfono móvil)";

        /// <summary>
        /// Devuelve todos los datos del registro como un arreglo.
        /// </summary>
        /// <returns>Los datos del registro como arreglo</returns>
        public string[] ToArray() => new string[] { Number, Name, Address, Identification, Provincia };

    } // class


    // los números fijos
    [Table("fix")]
    public class Fix
    {
        // los campos
        [Key]
        public string Number { get; set; }
        public string Name { get; set; }
        public string Address { get; set; }
        public int Province { get; set; }

        /// <summary>
        /// Retrocompatibilidad. Los móviles tienen este campo Identification, los fijos NO.
        /// </summary>
        public string Identification { get; } = "(teléfono fijo)";

        /// <summary>
        /// Devuelve este registro como si fuera un Movil.
        /// Da acceso a los demás método, como .Provincia() y .ToArray()
        /// </summary>
        /// <returns>el mismo registro pero como objeto Movil</returns>
        public Movil ToMovil() => new Movil() { Number = Number, Name = Name, Address = Address, Province = Province, Identification = Identification };

    } // class Fix


} // namespace
